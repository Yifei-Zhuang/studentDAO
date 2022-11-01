import React, { useEffect, useState } from 'react'
import {
  studentContract,
  myERC20Contract,
  myERC721Contract,
  web3,
} from '../../utils'
import './index.css'
import {
  Image,
  Button,
  Input,
  Table,
  Tag,
  Space,
  Layout,
  Descriptions,
  Typography,
  Divider,
  Modal,
} from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import {
  Header as HeaderWrapper,
  Content,
  Footer,
} from 'antd/lib/layout/layout'
import axios from 'axios'
import NewProposalForm from '../../components/NewProposalForm'
const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)
const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'
interface ProposalType {
  approverCount: number
  duration: number
  index: number
  opponentCount: number
  proposer: string
  startTime: string
  state: boolean
  description: string
  canvote: boolean
}

const StudentPage = () => {
  const { Title } = Typography
  const [account, setAccount] = useState('')
  const [accountBalance, setAccountBalance] = useState(0)
  const [voteAmount, setVoteAmount] = useState(0)
  const [proposals, setProposals] = useState<ProposalType[]>([])
  const [refreshBalance, setRefreshBalance] = useState(false)
  const [passCount, setPassCount] = useState(0)
  const [souvenir, setSouvenir] = useState('')
  const [showSouvenirModal, setShowSouvenirModal] = useState(false)
  const [imageURL, setImageURL] = useState('')

  useEffect(() => {
    // 初始化检查用户是否已经连接钱包
    // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
    const initCheckAccounts = async () => {
      // @ts-ignore
      const { ethereum } = window
      if (Boolean(ethereum && ethereum.isMetaMask)) {
        // 尝试获取连接的用户账户
        const accounts = await web3.eth.getAccounts()
        // console.log(accounts)
        if (accounts && accounts.length) {
          console.log('account', account)
          setAccount(accounts[0])
          console.log('account', account)
        }
      }
    }

    initCheckAccounts()
  }, [])

  useEffect(() => {
    const getStudentContractInfo = async () => {
      if (studentContract) {
        const va = await studentContract.methods.getVoteCost().call()
        setVoteAmount(va)
      } else {
        alert('Contract not exists.')
      }
    }

    getStudentContractInfo()
  }, [account])

  useEffect(() => {
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
        // console.log('ranking getted', ranking)
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

    if (account !== '') {
      getAccountInfo()
    }
  }, [account, refreshBalance])

  useEffect(() => {
    onGetProposals()
  }, [account])
  const onGetProposals = () => {
    try {
      const Mapping = async (props: any) => {
        return props?.map((item: any) => {
          return {
            index: item[0],
            proposer: item[1],
            startTime: item[2],
            duration: item[3],
            state: item[4],
            approverCount: item[5],
            opponentCount: item[6],
            description: item[7],
            canvote: item[8],
          }
        })
      }
      const getProposals = async () => {
        if (myERC20Contract) {
          const prepros = await studentContract.methods
            .getProposals(account)
            .call()
          const pros = await Mapping(prepros)
          let count = 0
          pros.forEach((item: any) => {
            if (
              item.proposer === account &&
              item.state &&
              item.approverCount > item.opponentCount
            ) {
              count++
            }
            setPassCount(count)
          })
          setProposals(pros)
        } else {
          alert('Contract not exists.')
        }
      }

      if (account !== '') {
        getProposals()
      }
    } catch (e) {
      console.log(e)
    }
  }

  const onFreshProposals = () => {
    try {
      const freshProposals = async () => {
        if (myERC20Contract) {
          const pros = await studentContract.methods
            .refreshAllProposals()
            .send({
              from: account,
            })
        } else {
          alert('Contract not exists.')
        }
      }

      if (account !== '') {
        freshProposals()
      }
    } catch (e) {
      console.log(e)
    }
  }

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

  const onClickConnectWallet = async () => {
    // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
    // @ts-ignore
    const { ethereum } = window
    if (!Boolean(ethereum && ethereum.isMetaMask)) {
      alert('MetaMask is not installed!')
      return
    }

    try {
      // 如果当前小狐狸不在本地链上，切换Metamask到本地测试链
      if (ethereum.chainId !== GanacheTestChainId) {
        const chain = {
          chainId: GanacheTestChainId, // Chain-ID
          chainName: GanacheTestChainName, // Chain-Name
          rpcUrls: [GanacheTestChainRpcUrl], // RPC-URL
        }

        try {
          // 尝试切换到本地网络
          await ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: chain.chainId }],
          })
        } catch (switchError: any) {
          // 如果本地网络没有添加到Metamask中，添加该网络
          if (switchError.code === 4902) {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [chain],
            })
          }
        }
      }

      // 小狐狸成功切换网络了，接下来让小狐狸请求用户的授权
      await ethereum.request({ method: 'eth_requestAccounts' })
      // 获取小狐狸拿到的授权用户列表
      const accounts = await ethereum.request({ method: 'eth_accounts' })
      // 如果用户存在，展示其account，否则显示错误信息
      setAccount(accounts[0] || 'Not able to get accounts')
    } catch (error: any) {
      alert(error.message)
    }
  }
  const columns: ColumnsType<ProposalType> = [
    {
      title: '编号',
      dataIndex: 'index',
      key: 'index',
    },
    {
      title: '提案发起者',
      dataIndex: 'proposer',
      key: 'proposer',
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'index',
    },
    {
      title: '开始时间',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (_, { startTime }) => (
        <>{new Date(parseInt(startTime) * 1000).toLocaleTimeString()}</>
      ),
    },
    {
      title: '持续时间',
      dataIndex: 'duration',
      key: 'duration',
      render: (_, { duration }) => <>{duration}秒</>,
    },
    {
      title: '赞同者人数',
      dataIndex: 'approverCount',
      key: 'approverCount',
    },
    {
      title: '反对者人数',
      dataIndex: 'opponentCount',
      key: 'opponentCount',
    },

    {
      title: '状态',
      key: 'index',
      dataIndex: 'state',
      render: (_, { state, approverCount, opponentCount }) => (
        <>
          <Tag
            color={
              state
                ? approverCount > opponentCount
                  ? 'green'
                  : 'red'
                : 'geekblue'
            }
            key={_}
          >
            {state
              ? approverCount > opponentCount
                ? '通过'
                : '未通过'
              : '尚未结算'}
          </Tag>
        </>
      ),
    },
    {
      title: '操作',
      key: 'action',
      render: (_, record) => (
        <Space size="middle">
          <div className="buttons">
            <Button
              style={{ width: '200px' }}
              onClick={() => onVoteFor(record.index)}
              disabled={!record.canvote}
            >
              投票支持
            </Button>
            <Button
              style={{ width: '200px' }}
              onClick={() => onVoteAgainst(record.index)}
              disabled={!record.canvote}
            >
              投票反对
            </Button>
          </div>
        </Space>
      ),
    },
  ]
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

  const showReward = () => {
    ;(async () => {
      const temp = await myERC721Contract.methods.GetAllSouvenir().call()
      console.log(temp)
      for (let i = 0; i < temp.length; i++) {
        if (temp[i][1] === account && temp[i][2] !== '') {
          setSouvenir(temp[i][2])
        }
      }
    })()
  }

  return (
    <React.Fragment>
      <Layout className="container">
        <HeaderWrapper className="head">
          <h1>浙大投票系统</h1>
        </HeaderWrapper>
        <Content
        // style={{
        //   margin: '2em',
        // }}
        >
          <div className="main">
            <div>
              <Button onClick={onClaimTokenAirdrop}>
                <div>领取浙大币空投（可以用于提出提案或者对提案进行表决）</div>
              </Button>
              <Button onClick={onGetProposals}>获取提案列表</Button>
              <Button onClick={onFreshProposals}>刷新提案列表</Button>
            </div>
            <Divider />
            {account === '' && (
              <Button onClick={onClickConnectWallet}>连接钱包</Button>
            )}
            <Descriptions
              title="用户信息"
              className="account"
              style={{
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <Descriptions.Item label="账户地址">
                {account === '' ? '无用户连接' : account}
              </Descriptions.Item>
              <div></div>
              <Descriptions.Item label="浙大币持有量">
                {account === '' ? 0 : accountBalance}
              </Descriptions.Item>
              <Descriptions.Item label="当前账户通过提案数">
                {account === '' ? 0 : passCount}
                <Button
                  style={{
                    marginLeft: '3em',
                  }}
                  disabled={passCount < 3}
                  onClick={() => {
                    setShowSouvenirModal(true)
                  }}
                >
                  添加纪念品（通过提案三次可用）
                </Button>
                <Button
                  style={{
                    marginLeft: '3em',
                  }}
                  disabled={passCount < 3}
                  onClick={() => {
                    showReward()
                  }}
                >
                  查看纪念品
                </Button>
              </Descriptions.Item>
            </Descriptions>
            {souvenir !== '' ? (
              <>
                <Title level={2}>
                  恭喜你成功发起并通过了超过3个提案，这是给你的纪念品
                </Title>
                <Image src={`${souvenir}`} />
              </>
            ) : (
              <></>
            )}
            <Divider />
            <div>
              你可以使用{voteAmount}
              个浙大币发起提案,或者使用500个浙大币参加提案的表决
            </div>
          </div>
        </Content>
        <Footer>
          <NewProposalForm
            account={account}
            voteAmount={voteAmount}
            getProposals={onGetProposals}
          />
        </Footer>
      </Layout>
      <Table
        rowKey={'index'}
        columns={columns}
        dataSource={proposals}
        pagination={false}
      />
      <Modal
        title="添加纪念品"
        onCancel={() => setShowSouvenirModal(false)}
        open={showSouvenirModal}
        onOk={getReward}
      >
        添加纪念品
      </Modal>
    </React.Fragment>
  )
}

export default StudentPage
