import React from 'react'
import { ethers } from 'ethers'
import BscDapp from '@obsidians/bsc-dapp'

import logo from './logo.svg';
import './App.css';

import abi from './coin.json'

const message = 'Hello Binance Smart Chain'

export default function App () {
  const dapp = React.useMemo(() => new BscDapp(), [])
  // const dapp = React.useMemo(() => new BscDapp({ extension: 'MetaMask' }), [])
  // const dapp = React.useMemo(() => new BscDapp({ extension: 'BinanceChainWallet' }), [])
  window.dapp = dapp

  const [enabled, setEnabled] = React.useState(dapp.isBrowserExtensionEnabled)
  const [account, setAccount] = React.useState(dapp.currentAddress)
  const [network, setNetwork] = React.useState()
  const [transferInfo, setTransferInfo] = React.useState({
    to: '0x987ffbf3f7cdabb38782b9886d257ce74f338da5',
    amount: '0.01',
    txHash: ''
  })
  const [isUpdatingBalance, setIsUpdatingBalance] = React.useState(false)
  const [balance, updateBalance] = React.useState(0)
  const [contractInfo, setContractInfo] = React.useState({
    address: '0x4f0c82d339eeba7ed0249f573dc0bcdcb578154f',
    txHash: ''
  })
  const [sig, setSig] = React.useState('')

  React.useEffect(() => dapp.onEnabled(account => {
    setEnabled(true)
    setAccount(account)
    updateNetwork(dapp.network)
    setIsUpdatingBalance(true)
  }), [])

  React.useEffect(() => dapp.onNetworkChanged(result => {
    updateNetwork(result)
  }), [])


  React.useEffect(() => dapp.onAccountChanged(account => {
    setAccount(account)
  }), [])

  React.useEffect(async () => {
    if (isUpdatingBalance == false ) return;
    console.log("Updating");
    let address = "0xef49e39074b9741f0ce81722b0bc890565497a7a";
    let abi = [
      "function balanceOf(address) view returns (uint)",
    ];
    const balance = await dapp.getCoinBalance({address,abi}, "balanceOf", [account.address]);
    console.log(balance);
    updateBalance(balance);
    setIsUpdatingBalance(false)
  }, [isUpdatingBalance])

  const updateNetwork = (network = {}) => {
    if (network.isBscMainnet) {
      setNetwork('Mainnet')
    } else if (network.isBscTestnet) {
      setNetwork('Testnet')
    } else {
      setNetwork()
    }
  }

  const signMessage = async () => {
    let sig
    if (dapp.browserExtension.name === 'MetaMask') {
      // Ref EIP-712, sign data that has a structure
      sig = await dapp.signTypedData([{ type: 'string', name: 'Message', value: message }])
    } else {
      // Binance Chain Wallet doesn't support signTypedData yet
      sig = await dapp.signMessage(message)
    }
    setSig(sig)
  }

  const transfer = async (to, amount) => {
    const tx = {
      from: account.address,
      to,
      value: dapp.parseEther(amount),
    };
    const txHash = await dapp.sendTransaction(tx)
    setTransferInfo({ ...transferInfo, txHash })
  }

  const execute = async () => {
    const { address } = contractInfo
    const txParams = await dapp.executeContract({ address, abi }, 'test')
    const txHash = await dapp.sendTransaction({
      from: account.address,
      value: dapp.parseEther('0'),
      ...txParams,
    })
    setContractInfo({ ...contractInfo, txHash })
  }

  let browserExtensionStatus
  let enableButton = null
  if (dapp.isBrowserExtensionInstalled) {
    browserExtensionStatus = `${dapp.browserExtension.name} Detected. ${enabled ? 'Enabled.' : 'Not enabled'}`
    if (!enabled) {
      enableButton = (
        <button onClick={() => dapp.enableBrowserExtension()}>
          Enable {dapp.browserExtension.name}
        </button>
      )
    }
  } else {
    browserExtensionStatus = 'No Browser Extension detected'
  }

  let accountInfo = null
  if (enabled && account) {
    accountInfo = (
      <div>
        Current account: <small><code>{account.address}</code></small>
        <button onClick={() => refreshBalance()}>Refresh</button>
        {/* <button onClick={() => getBalanceAndHistory()}>Get Balance and History</button> */}
        <br />
        Balance:{balance.toString()}
      </div>
    )
  }

  const refreshBalance = async () => {
    setIsUpdatingBalance(true)
  }

  const getBalanceAndHistory = async () => {
    const balance = await dapp.rpc.getBalance(account.address)
    console.log('Balance:', balance.toString())

    const txs = await dapp.explorer.getHistory(account.address)
    console.log('TX History:', txs)
  }

  let networkInfo = null
  if (enabled) {
    if (network) {
      networkInfo = <p>Network: BSC {network}</p>
    } else {
      networkInfo = <p>Not connected to BSC Mainnet (<a target='_black' href='https://docs.binance.org/smart-chain/wallet/metamask.html'>Use BSC with Metamask</a>)</p>
    }
  }

  let signMessageButton = null
  if (enabled && network) {
    signMessageButton = <div style={{ margin: '20px 0'}}>
      <div>message: <small><code>{message}</code></small></div>
      <div>signature: <small><code>{sig}</code></small></div>
      {!sig && <button onClick={() => signMessage()}>Sign Message</button>}
    </div>
  }

  let transferForm = null
  if (enabled && network) {
    transferForm = <div style={{ margin: '20px 0' }}>
      <div>
        Transfer
      </div>
      to:
      <input
        value={transferInfo.to}
        onChange={(e) => setTransferInfo({ ...transferInfo, to: e.target.value })}
        placeholder="Transfer to"
      />
      <br />
      amount:
      <input
        value={transferInfo.amount}
        onChange={(e) => setTransferInfo({ ...transferInfo, amount: e.target.value })}
        placeholder="Transfer amount"
      />
      <br />
      <button onClick={() => transfer(transferInfo.to, transferInfo.amount)}>Transfer</button>
      {
        !!transferInfo.txHash &&
        <div>{transferInfo.txHash}</div>
      }
    </div>
  }

  let contractForm = null
  if (enabled && network) {
    contractForm = <div style={{ margin: '20px 0' }}>
      <div>
        Contract
      </div>
      <input
        value={contractInfo.address}
        onChange={(e) => setContractInfo({ ...contractInfo, address: e.target.value })}
        placeholder="Contract Address"
        style={{ width:"300px" }}
      />
      <br />
      method: test
      {/* <br />
      param1 (receiver):
      <input
        value={contractInfo.receiver}
        onChange={(e) => setContractInfo({ ...contractInfo, receiver: e.target.value })}
        placeholder="Receiver"
      />
      <br />
      param2 (amount):
      <input
        value={contractInfo.amount}
        onChange={(e) => setContractInfo({ ...contractInfo, amount: e.target.value })}
        placeholder="Amount"
      /> */}
      <br />
      <button onClick={() => execute()} style={{margin:"30px"}}>Execute</button>
      {
        !!contractInfo.txHash &&
        <div><a href={"https://testnet.bscscan.com/tx/"+contractInfo.txHash} >{contractInfo.txHash}</a></div>
      }
    </div>
  }

  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
        <p>{browserExtensionStatus}</p>
        {enableButton}
        {accountInfo}
        {networkInfo}
        {/* {signMessageButton} */}
        {/* {transferForm} */}
        {contractForm}
      </header>
    </div>
  );
}
