import { useState } from 'react'
import { studentContract, myERC20Contract } from '../utils'
import { Input, Button } from 'antd'
const NewProposalForm = (props: {
  account: string
  voteAmount: number
  getProposals: Function
}) => {
  const { account, voteAmount, getProposals } = props
  const [proposalName, setProposalName] = useState('')
  const [proposalDuration, setProposalDuration] = useState('')
  const [proposalDescription, setProposalDescription] = useState('')
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

  return (
    <div>
      提案名
      <Input
        value={proposalName}
        name="proposalName"
        placeholder="输入提案名"
        onChange={(e) => {
          setProposalName(e.target.value)
        }}
      />
      持续时间/秒
      <Input
        value={proposalDuration}
        onChange={(e) => {
          setProposalDuration(e.target.value)
        }}
        name="proposalDuration"
        placeholder="输入提案持续时间"
      />
      描述
      <Input
        value={proposalDescription}
        onChange={(e) => {
          setProposalDescription(e.target.value)
        }}
        name="proposalDuration"
        placeholder="输入提案描述"
        title="描述"
      />
      <Button type="primary" onClick={onSubmitProposal}>
        提交提案
      </Button>
    </div>
  )
}
export default NewProposalForm
