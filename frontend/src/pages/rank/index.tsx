import React, { useEffect, useState } from 'react'
import { studentContract, myERC20Contract, web3 } from '../../utils'
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
} from 'antd'
import type { ColumnsType } from 'antd/lib/table'
import {
  Header as HeaderWrapper,
  Content,
  Footer,
} from 'antd/lib/layout/layout'
const GanacheTestChainId = '0x539' // Ganache默认的ChainId = 0x539 = Hex(1337)

const GanacheTestChainName = 'Ganache Test Chain'
const GanacheTestChainRpcUrl = 'http://127.0.0.1:8545'

const RankPage = () => {
  const [account, setAccount] = useState('')

  const [passCount, setPassCount] = useState([])
  useEffect(() => {
    // 初始化检查用户是否已经连接钱包
    // 查看window对象里是否存在ethereum（metamask安装后注入的）对象
    const initCheckAccounts = async () => {
      // @ts-ignore
      const { ethereum } = window
      if (Boolean(ethereum && ethereum.isMetaMask)) {
        // 尝试获取连接的用户账户
        const accounts = await web3.eth.getAccounts()
        console.log(accounts)
        if (accounts && accounts.length) {
          setAccount(accounts[0])
        }
      }
    }

    initCheckAccounts()
  }, [])

  useEffect(() => {
    onGetRankingList()
  }, [account])
  const onGetRankingList = () => {
    try {
      const Mapping = async (props: any) => {
        console.log(props)
        return props?.map((item: any) => {
          return {
            address: item[0],
            passCount: item[1],
          }
        })
      }
      const getProposals = async () => {
        if (myERC20Contract) {
          console.log('getting ranking ')
          const preRanking = await studentContract.methods
            .getAllPassCount()
            .call()
          const ranking = await Mapping(preRanking)
          console.log('ranking getted', ranking)
          setPassCount(ranking)
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

  const columns: ColumnsType<{
    readonly address: string
    readonly passCount: number
  }> = [
    {
      title: 'Address',
      dataIndex: 'address',
      key: 'address',
    },
    {
      title: 'PassCount',
      dataIndex: 'passCount',
      key: 'address',
    },
  ]
  const { Title } = Typography
  return (
    <React.Fragment>
      <Layout className="container">
        <HeaderWrapper className="head">
          <h1>浙大投票系统</h1>
        </HeaderWrapper>
        <Content
          style={{
            margin: '2em',
          }}
        >
          <h1> 所有账户通过的提案数量统计 </h1>
          <Table
            rowKey={'address'}
            columns={columns}
            dataSource={passCount}
            pagination={false}
          />
        </Content>
        <Footer></Footer>
      </Layout>
    </React.Fragment>
  )
}

export default RankPage
