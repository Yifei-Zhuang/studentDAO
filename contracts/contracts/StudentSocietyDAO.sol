// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

// Uncomment the line to use openzeppelin/ERC20
// You can use this dependency directly because it has been installed already
//import "../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "./MyERC20.sol";
import "./MyERC721.sol";

// Uncomment this line to use console.log
// import "hardhat/console.sol";

contract StudentSocietyDAO {
    MyERC20 public myERC20;
    MyERC721 public myERC721;
    // 一次vote花费500代币
    uint256 private constant VOTE_COST = 500;
    // use a event if you want
    event ProposalInitiated(uint256 proposalIndex, uint256 timestamp);
    event constructed(uint32 input);
    event getProposalEvent(uint32 input);
    event voteForEvent(address ad, uint256);
    event voteAgainstEvent(address ad, uint256);

    //! 当提案通过的时候，将所有积分中的50%发放给提案发起者，将剩下的50%均分给所有赞同者
    //!  当提案未得到通过的时候，将所有积分均分给不赞同提案的人
    struct Proposal {
        uint256 index; // 提案id
        address proposer; // 发起者
        uint256 startTime; // 开始时间
        uint256 duration; // 持续时间
        string name; // 提案名
        bool state; // 合约是否已经被结算过
        address[] approvers; // 赞同提案的人
        address[] opponents; // 不赞同提案的人
        string description; // 提案描述
    }
    // 记录账户通过的合约的总数，用来发放纪念品
    mapping(address => uint256) passCount;
    // 存储账户是否给提案投过票，避免重复投票
    mapping(uint256 => mapping(address => bool)) hasVoted;

    Proposal[] proposals;

    constructor() {
        // maybe you need a constructor
        myERC20 = new MyERC20("ZJUToken", "ZJUTokenSymbol");
        myERC721 = new MyERC721();
        emit constructed(1);
    }

    // 发起提案
    function launchProposals(
        uint256 duration,
        string memory name,
        string memory description
    ) external returns (bool) {
        uint256 index = proposals.length;
        // 存储提案
        proposals.push(
            Proposal(
                index,
                msg.sender,
                block.timestamp,
                duration,
                name,
                false,
                new address[](0),
                new address[](0),
                description
            )
        );

        Proposal storage p = proposals[index];
        emit voteForEvent(msg.sender, p.index);

        // 将对应账户的代币转账到合约名下暂时保存
        myERC20.transferFrom(msg.sender, address(this), VOTE_COST);
        // 记录信息
        p.approvers.push(msg.sender);
        hasVoted[index][msg.sender] = true;

        emit ProposalInitiated(proposals.length, block.timestamp);
        return true;
    }

    // 仅仅用作函数返回
    struct returnProposalStruct {
        uint256 index; // index of this proposal
        address proposer; // who make this proposal
        uint256 startTime; // proposal start time
        uint256 duration; // proposal duration
        bool state; // 合约是否已经被结算过
        uint256 approverCount; // 赞同提案的人
        uint256 opponentCount; // 不赞同提案的人
        string description;
        bool canvote;
    }

    //* 以下是proposal相关的一系列函数
    //* 获取所有提案的状态
    function getProposals(address cur)
        external
        view
        returns (returnProposalStruct[] memory)
    {
        returnProposalStruct[] memory temp = new returnProposalStruct[](
            proposals.length
        );

        for (uint256 i = 0; i < proposals.length; i++) {
            // Proposal storage p = proposals[i];
            returnProposalStruct memory mirrorP;
            mirrorP.index = proposals[i].index;
            mirrorP.proposer = proposals[i].proposer;
            mirrorP.startTime = proposals[i].startTime;
            mirrorP.duration = proposals[i].duration;
            mirrorP.state = proposals[i].state;
            mirrorP.approverCount = proposals[i].approvers.length;
            mirrorP.opponentCount = proposals[i].opponents.length;
            mirrorP.description = proposals[i].description;
            mirrorP.canvote = !proposals[i].state && !hasVoted[i][cur];
            temp[i] = mirrorP;
        }
        return temp;
    }

    // 刷新所有提案的状态
    function refreshAllProposals() external {
        //对所有提案进行结算
        for (uint256 i = 0; i < proposals.length; i++) {
            checkProposal(i);
        }
    }

    // 避免异常
    function uncheckedAdd(uint256 a, uint256 b) public pure returns (uint256) {
        unchecked {
            return a + b;
        }
    }

    // 仅仅用作函数返回
    struct returnPassCountStruct {
        address Address;
        uint256 Count;
    }

    // 获得所有账户通过的提案数
    function getAllPassCount()
        external
        view
        returns (returnPassCountStruct[] memory)
    {
        returnPassCountStruct[] memory temp = new returnPassCountStruct[](
            proposals.length
        );
        uint len = proposals.length;
        for (uint i = 0; i < len; i++) {
            address curAddress = proposals[i].proposer;
            temp[i].Address = curAddress;
            temp[i].Count = passCount[curAddress];
        }
        return temp;
    }

    // 获取单个账户通过的提案数
    function getPassCount() external view returns (uint256) {
        return passCount[msg.sender];
    }

    // 对合约状态进行检查，并执行奖励等逻辑
    function checkProposal(uint256 proposalID) private returns (bool) {
        Proposal memory p = proposals[proposalID];
        // 如果提案已经截止，那么返回结果
        if (uncheckedAdd(p.startTime, p.duration) <= block.timestamp) {
            // 查看合约是否已经被结算过
            if ((p.state) == false) {
                // 进行合约结算
                //奖励逻辑：
                //通过条件：赞同者人数超过反对者
                //如果提案通过，对发起者奖励50%的总代币，其他赞同者（可以包括发起者）均分剩下的代币，
                // 暂时未实现：发起者可以额外获得500代币
                //如果提案未能通过，所有反对者均分剩下的代币

                uint256 appCount = p.approvers.length;
                uint256 oppCount = p.opponents.length;
                uint256 total = appCount + oppCount;
                if (appCount > oppCount) {
                    //提案获得通过
                    //将50%的总代币和500代币发放给发起者
                    uint256 reward = (VOTE_COST * total) / uint256(2);
                    uint256 remainder = total * VOTE_COST - reward;
                    uint256 single = remainder / appCount;
                    uint256 finalRemainder = remainder - single * appCount;
                    // 对发起者进行奖励
                    myERC20.transfer(p.proposer, reward);
                    for (uint256 i = 0; i < appCount; i++) {
                        // 将其余赞同者的投票支出返还
                        myERC20.transfer(p.approvers[i], single);
                    }
                    // 如果还有剩下的钱，全部转给发起者
                    myERC20.transfer(p.proposer, finalRemainder);
                    // 记录该账户发起提案通过的次数
                    passCount[p.proposer] = passCount[p.proposer] + 1;
                    if (passCount[p.proposer] == 3) {
                        //TODO 发放纪念品奖励
                    }
                } else {
                    // 提案未获通过
                    // 直接将所有代币均分给反对者们
                    uint256 single = (total * VOTE_COST) / oppCount;
                    uint256 remainder = total * VOTE_COST - single * oppCount;
                    for (uint256 i = 0; i < oppCount; i++) {
                        myERC20.transfer(p.opponents[i], single);
                    }
                    // 剩下的钱转给第一个反对的人
                    myERC20.transfer(p.opponents[0], remainder);
                }
                Proposal storage pp = proposals[proposalID];
                // 注明提案已经结算
                pp.state = true;
            }
            return false;
        }
        return true;
    }

    //* 投票支持
    //* 返回值表示投票行为成功或失败(注意不是提案本身成功还是失败)
    function voteFor(uint256 proposalID) external returns (bool) {
        Proposal storage p = proposals[proposalID];
        emit voteForEvent(msg.sender, p.index);
        if (checkProposal(proposalID) && !hasVoted[proposalID][msg.sender]) {
            // 提案还未截止
            // 将对应账户的代币转账到合约名下暂时保存
            myERC20.transferFrom(msg.sender, address(this), VOTE_COST);
            // 记录信息
            p.approvers.push(msg.sender);
            hasVoted[proposalID][msg.sender] = true;
            return true;
        }
        return false;
    }

    //* 投票反对
    //  一样，返回值只表示投票行为成功还是失败，并不是提案本身是否通过
    function voteAgainst(uint256 proposalID) external returns (bool) {
        Proposal storage p = proposals[proposalID];
        emit voteAgainstEvent(msg.sender, p.index);
        if (checkProposal(proposalID) && !hasVoted[proposalID][msg.sender]) {
            //     // 提案还未截止
            //     // 将对应账户的代币转账到合约名下暂时保存
            myERC20.transferFrom(msg.sender, address(this), VOTE_COST);
            //     // 记录信息
            hasVoted[proposalID][msg.sender] = true;
            p.opponents.push(msg.sender);
            return true;
        }
        return false;
    }

    // 添加纪念品
    function addSouvenir(address _to, string memory souvenir) external {
        myERC721.mint(_to, souvenir);
    }

    // 获取余额
    function getBalance() external view returns (uint256) {
        return myERC20.balanceOf(msg.sender);
    }

    // function helloworld() external pure returns (string memory) {
    //     return "hello world";
    // }

    function getVoteCost() external pure returns (uint256) {
        return VOTE_COST;
    }
}
