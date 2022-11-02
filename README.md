# 基于智能合约实现的去中心化学生社团组织治理应用

3200105872 软工2002 庄毅非

## 如何运行

1. 在本地启动ganache应用。

2. 在 `./contracts` 中安装需要的依赖，运行如下的命令：
    ```bash
    npm install
    ```

3. 编辑`contracts`文件夹下的`hardhat.config.js`文件，`url`修改为您本地启动的ganache服务的rpc url，将accounts数组下的几个地址修改为您ganache服务器中的几个账户的私钥

4. 在 `./contracts` 中编译合约，运行如下的命令：

    ```bash
    npx hardhat run scripts/deploy.ts --network ganache
    ```

5. 将`contracts/artifacts/contracts/MyERC20`文件夹下的`MyERC20.json`文件复制到`frontend/src/utils/abis/`目录下；将`contracts/artifacts/contracts/MyERC721`文件夹下的`MyERC721.json`文件复制到`frontend/src/utils/abis/`目录下；将`contracts/artifacts/contracts/StudentSocietyDAO`文件夹下的`StudentSocietyDAO.json`文件复制到`frontend/src/utils/abis/`目录下；

6. 将第四步部署过程中输出的地址填到`frontend/src/utils/contract-addresses.json`对应的项上

    ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/imGAm5.png)

7. 在`./frontend`文件夹下安装依赖，运行如下命令

    ```bash
    npm i
    ```

8. 在 `./frontend` 中启动前端程序，运行如下的命令：

    ```bash
    npm run start
    ```

## 功能实现分析

### 1. 学生积分管理

- 在myERC20.sol文件中定义了MyERC20类继承了ERC20类，实现了代币管理功能，这里使用了一个mapping `claimedAirdropStudentList`存储了用户是否已经领取过代币，避免重复领取

  ```solidity
  contract MyERC20 is ERC20 {
      mapping(address => bool) claimedAirdropStudentList;
  
      constructor(string memory name, string memory symbol) ERC20(name, symbol) {}
  
      //* 向请求代币的账户发放1000个代币
      function airdrop() external {
          require(
              claimedAirdropStudentList[msg.sender] == false,
              "This user has claimed airdrop already"
          );
          _mint(msg.sender, 10000);
          claimedAirdropStudentList[msg.sender] = true;
      }
  }
  
  ```
  
- 在前端定义了功能函数`onClaimTokenAirdrop`，用来领取代币

  ```ts
  const onClaimTokenAirdrop = async () => {
      if (account === '') {
        alert('You have not connected wallet yet.')
        return
      }
      if (myERC20Contract) {
        try {
          await myERC20Contract.methods.airdrop().send({
            from: account,
          })
          setRefreshBalance(!refreshBalance)
          alert('You have claimed ZJU Token.')
        } catch (error: any) {
          alert(error.message)
        }
      } else {
        alert('Contract not exists.')
      }
    }
  ```

### 2. 学生信息获取

- 在前端定义了函数`getAccountInfo`获取学生代币余额和通过的提案数量,使用useEffect进行信息动态更新

  ```ts
  const getAccountInfo = async () => {
        // 将返回的数组的数组映射为对象数组
        const Mapping = async (props: any) => {
          return props?.map((item: any) => {
            return {
              address: item[0],
              passCount: item[1],
            }
          })
        }
        if (myERC20Contract) {
          // 获取余额
          const ab = await myERC20Contract.methods.balanceOf(account).call()
          setAccountBalance(ab)
          const preRanking = await studentContract.methods
            .getAllPassCount()
            .call()
          const ranking = await Mapping(preRanking)
          setPassCount(0)
          for (let i = 0; i < ranking.length; i++) {
            if (ranking[i].address == account) {
              // 获取通过的提案数量，为纪念品部分服务
              setPassCount(ranking[i].passCount)
              // console.log('found', ranking[i])
              break
            }
          }
        } else {
          alert('Contract not exists.')
        }
      }
  ```

- 在studentSociety.sol中定义了getPassCount函数获取当前账户通过的提案数量

  ```solidity
  struct returnPassCountStruct {
      address Address;
      uint256 Count;
  }
  // 返回所有账户的通过的提案数
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
              // 遍历
              address curAddress = proposals[i].proposer;
              temp[i].Address = curAddress;
              temp[i].Count = passCount[curAddress];
          }
          return temp;
      }
  ```

### 3. 学生提交提案

- 在NewProposalForm.tsx中定义了提案提交函数

  ```ts
  const onSubmitProposal = () => {
      const submitProposals = async () => {
        if (studentContract) {
          // 使用approve函数供erc20使用
          await myERC20Contract.methods
            .approve(studentContract.options.address, voteAmount)
            .send({
              from: account,
            })
          // 创建提案
          await studentContract.methods
            .launchProposals(
              isNaN(parseInt(proposalDuration)) ? 0 : parseInt(proposalDuration),
              proposalName,
              proposalDescription,
            )
            .send({
              from: account,
            })
  
          alert('pros submitted successfully')
          getProposals()
        } else {
          alert('Contract not exists.')
        }
      }
  
      if (account !== '') {
        submitProposals()
      }
    }
  
  ```

- 在studentSociety.sol中定义了接受提案提交的函数

  ```solidity
  struct Proposal {
      uint32 index; // 提案id
      address proposer; // 发起者
      uint256 startTime; // 开始时间
      uint256 duration; // 持续时间
      string name; // 提案名
      bool state; // 合约是否已经被结算过
      address[] approvers; // 赞同提案的人
      address[] opponents; // 不赞同提案的人
      string description; // 提案描述
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
  
  ```
  
  

### 3. 学生对提案进行投票

#### 3.1 学生支持提案

- 在前端定义了onVoteFor函数处理投票支持功能

  ```ts
  
  // 投票支持
    const onVoteFor = async (proposalID: number) => {
      if (account === '') {
        alert('You have not connected wallet yet.')
        return
      }
  
      if (studentContract && myERC20Contract) {
        try {
          // 使用approve函数供erc20使用
          await myERC20Contract.methods
            .approve(studentContract.options.address, voteAmount)
            .send({
              from: account,
            })
  
          const status = await studentContract.methods.voteFor(proposalID).send({
            from: account,
          })
  
          alert(status ? 'You have vote for the proposal.' : 'vote for fail')
        } catch (error: any) {
          alert(error.message)
        }
      } else {
        alert('Contract not exists.')
      }
    }
  
  ```

- 在studentsocietyDAO.sol中定义了接受投票支持逻辑的函数votefor

  ```solidity
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
              // 记录本地址的用户已经投过票了，避免重复投票
              hasVoted[proposalID][msg.sender] = true;
              return true;
          }
          return false;
      }
  ```
  
  

#### 3.2 学生反对提案

- 在前端定义了onVoteAgainst函数处理投票支持功能

  ```ts
  // 投票反对
    const onVoteAgainst = async (proposalID: number) => {
      if (account === '') {
        alert('You have not connected wallet yet.')
        return
      }
  
      if (studentContract && myERC20Contract) {
        try {
          // 使用approve函数供erc20使用
          await myERC20Contract.methods
            .approve(studentContract.options.address, voteAmount)
            .send({
              from: account,
            })
          const status = await studentContract.methods
            .voteAgainst(proposalID)
            .send({
              from: account,
            })
  
          alert(
            status
              ? 'You have vote against thr proposal.'
              : 'vote against failed',
          )
        } catch (error: any) {
          alert(error.message)
        }
      } else {
        alert('Contract not exists.')
      }
    }
  
  ```

- 在studentsocietyDAO.sol中定义了接受投票支持逻辑的函数voteAgainst

  ```solidity
  
      //* 投票反对
      //  一样，返回值只表示投票行为成功还是失败，并不是提案本身是否通过
      function voteAgainst(uint256 proposalID) external returns (bool) {
          Proposal storage p = proposals[proposalID];
          emit voteAgainstEvent(msg.sender, p.index);
          if (checkProposal(proposalID) && !hasVoted[proposalID][msg.sender]) {
              // 提案还未截止
              // 将对应账户的代币转账到合约名下暂时保存
              myERC20.transferFrom(msg.sender, address(this), VOTE_COST);
              // 记录信息
              hasVoted[proposalID][msg.sender] = true;
              // 记录本地址的用户已经投过票了，避免重复投票
              p.opponents.push(msg.sender);
              return true;
          }
          return false;
      }
  ```

### 4. 刷新提案状态

- 在本项目中，如果提案到期（持续时间结束），那么用户可以点击`刷新提案状态`按钮，调用studentsocietyDAO.sol中定义的refreshAllProposals函数更新提案状态，具体更新逻辑如下

  ```solidity
      function refreshAllProposals() external {
          //对所有提案进行结算
          for (uint256 i = 0; i < proposals.length; i++) {
              checkProposal(i);
          }
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
  ```

  在本项目中，如果提案通过，那么发起者可以获得代币池中当前提案涉及的所有代币的一半，剩下的一半由所有支持者平分（包括发起者）；如果提案不通过，那么反对者可以平分当前代币池中当前提案涉及的所有代币。

### 5. 学生领取纪念品

- 在前端定义了`getReward`函数进行纪念品奖励

  ```ts
    const getReward = () => {
      ;(async () => {
        const baseURL = 'http://shibe.online/api/shibes?count=1'
        await axios({
          method: 'GET',
          url: baseURL,
        }).then((res: any) => {
          setImageURL(res.data[0])
        })
        setTimeout(async () => {
          await studentContract.methods.addSouvenir(account, imageURL).send({
            from: account,
          })
        }, 2000)
        // alert('You add souvenir success.')
        setShowSouvenirModal(false)
      })()
    }
  ```

- 在myERC721.sol中，本项目实现了纪念品的分发和储存

  ```solidity
  contract MyERC721 is ERC721, Ownable {
      using Counters for Counters.Counter;
      using Strings for uint256;
      Counters.Counter private _tokenIds;
      mapping(uint256 => string) _tokenURIs;
      mapping(uint256 => address) id2add;
  
      constructor() ERC721("GameItem", "ITM") {}
  
      function _setTokenURI(uint256 tokenId, string memory _tokenURI) private {
          if (!_exists(tokenId)) {
              revert();
          }
          _tokenURIs[tokenId] = _tokenURI;
      }
  
      struct returnSouvenir {
          uint index;
          address Address;
          string souvenir;
      }
  
      function GetAllSouvenir() external view returns (returnSouvenir[] memory) {
          returnSouvenir[] memory result = new returnSouvenir[](
              _tokenIds.current()
          );
          for (uint i = 1; i <= _tokenIds.current(); i++) {
              result[i - 1].index = i;
              result[i - 1].Address = id2add[i];
              result[i - 1].souvenir = _tokenURIs[i];
          }
          return result;
      }
  
      function mint(address _to, string memory tokenURI_) external onlyOwner {
          _tokenIds.increment();
          uint256 _tokenId = _tokenIds.current();
          // 添加tokenId
          _mint(_to, _tokenId);
          // 存储tokenURI
          _setTokenURI(_tokenId, tokenURI_);
          // 设定主人
          id2add[_tokenId] = _to;
      }
  }
  
  ```
  
  

### 6. 学生查看自己的纪念品

- 在前端实现了showReward函数进行纪念品链接获取

  ```ts
   const showReward = () => {
      ;(async () => {
        const temp = await myERC721Contract.methods.GetAllSouvenir().call()
        for (let i = 0; i < temp.length; i++) {
          if (temp[i][1] === account && temp[i][2] !== '') {
            setSouvenir(temp[i][2])
          }
        }
      })()
    }
  ```

- 在myERC721.sol中，使用GetAllSouvenir函数向前端返回纪念品链接

  ```solidity
      function GetAllSouvenir() external view returns (returnSouvenir[] memory) {
          returnSouvenir[] memory result = new returnSouvenir[](
              _tokenIds.current()
          );
          for (uint i = 1; i <= _tokenIds.current(); i++) {
              result[i - 1].index = i;
              result[i - 1].Address = id2add[i];
              result[i - 1].souvenir = _tokenURIs[i];
          }
          return result;
      }
  
  ```

  

## 项目运行截图

1. 欢迎页，点击链接钱包按钮连接metamask钱包

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/PmKlOv.png)

2. 连接钱包之后，点击领取浙大币空投领取积分，可以看到此时积分变为10000

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/XXPCid.png)

3. 在提交提案表单处输入提案名，持续时间和描述，点击提交提案按钮进行提案提交

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/Raeqqu.png)

  完成提交之后，会提示提交成功

![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/3uRRec.png)

4. 点击上面的获取提案列表，可以获取当前提案信息

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/lf7BIT.png)

5. 在提案持续时间结束之后，点击刷新提案列表刷新提案状态

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/AzQhRK.png)

6. 当通过的提案数达到3之后，点击添加纪念品即可进行纪念品获取，之后点击查看纪念品即可查看所得到的纪念品。

   ![](https://raw.githubusercontent.com/workflowBot/image_bed/main/uPic/oUb1zI.png))



## 参考内容

1. [erc 20 doc](https://docs.openzeppelin.com/contracts/2.x/api/token/erc20)
2. [erc 721 doc](https://docs.openzeppelin.com/contracts/2.x/api/token/erc721)
3. [course demo](https://github.com/LBruyne/blockchain-course-demos)

