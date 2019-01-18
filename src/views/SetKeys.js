import React from 'react'
import Maybe from 'folktale/maybe'
import * as azimuth from 'azimuth-js'
import * as ob from 'urbit-ob'
import { Row, Col, H1, P, Warning, Form, H3 } from '../components/Base'
import { RequiredInput, InnerLabel } from '../components/Base'

import StatelessTransaction from '../components/StatelessTransaction'
import { BRIDGE_ERROR } from '../lib/error'
import { ROUTE_NAMES } from '../lib/router'
import { attemptSeedDerivation } from '../lib/keys'

import * as kg from '../../node_modules/urbit-key-generation/dist/index'

import {
  sendSignedTransaction,
  fromWei,
 } from '../lib/txn'

import {
  addressFromSecp256k1Public,
  addHexPrefix
} from '../lib/wallet'

class SetKeys extends React.Component {
  constructor(props) {
    super(props)

    const point = props.pointCursor.matchWith({
      Just: (shp) => shp.value,
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_POINT
      }
    })

    this.state = {
      auth: '',
      encr: '',
      networkSeed: '',
      point: point,
      cryptoSuiteVersion: 1,
      continuity: false,
      txn: Maybe.Nothing(),
      txError: Maybe.Nothing(),
      userApproval: false,
      nonce: '',
      gasPrice: '5',
      chainId: '',
      gasLimit: '600000',
      stx: Maybe.Nothing(),
    }

    this.handleNetworkSeedInput = this.handleNetworkSeedInput.bind(this)
    // Transaction
    this.handleCreateUnsignedTxn = this.handleCreateUnsignedTxn.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
    this.handleSetUserApproval = this.handleSetUserApproval.bind(this)
    this.handleSetTxn = this.handleSetTxn.bind(this)
    this.handleSetStx = this.handleSetStx.bind(this)
    this.handleSetNonce = this.handleSetNonce.bind(this)
    this.handleSetChainId = this.handleSetChainId.bind(this)
    this.handleSetGasPrice = this.handleSetGasPrice.bind(this)
    this.handleSetGasLimit = this.handleSetGasLimit.bind(this)
  }


  componentDidMount() {
    const { props } = this

    this.deriveSeed()

    const addr = props.wallet.matchWith({
      Just: wal => addressFromSecp256k1Public(wal.value.publicKey),
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_WALLET
      }
    })

    props.web3.matchWith({
      Nothing: () => {},
      Just: (w3) => {
        const validWeb3 = w3.value

        const getTxMetadata = [
          validWeb3.eth.getTransactionCount(addr),
          validWeb3.eth.net.getId(),
          validWeb3.eth.getGasPrice()
        ];

        Promise.all(getTxMetadata).then(r => {
          const txMetadata = {
            nonce: r[0],
            chainId: r[1],
            gasPrice: fromWei(r[2], 'gwei'),
          };

          this.setState({...txMetadata})

        })
      }
    });

  }


  async deriveSeed() {
    const next = true
    const seed = await attemptSeedDerivation(next, this.props)
    this.setState({
      networkSeed: seed.getOrElse('')
    })
  }



  handleNetworkSeedInput(networkSeed) {
    this.setState({ networkSeed })
  }



  handleCreateUnsignedTxn() {
    const txn = this.createUnsignedTxn()
    this.setState({ txn })
  }


  handleSetUserApproval(){
    const {state} = this
    this.setState({ userApproval: !state.userApproval })
  }



  handleSetTxn(txn){
    this.setState({ txn })
  }



  handleSetStx(stx){
    this.setState({
      stx,
      userApproval: false,
    })
  }



  handleSetNonce(nonce){
    this.setState({ nonce })
    this.handleClearStx()
  }



  handleSetChainId(chainId){
    this.setState({ chainId })
    this.handleClearStx()
  }



  handleSetGasPrice(gasPrice){
    this.setState({ gasPrice })
    this.handleClearStx()
  }



  handleSetGasLimit(gasLimit){
    this.setState({ gasLimit })
    this.handleClearStx()
  }



  handleClearStx() {
    this.setState({
      userApproval: false,
      stx: Maybe.Nothing(),
    })
  }




  handleClearTxn() {
    this.setState({
      userApproval: false,
      txn: Maybe.Nothing(),
      stx: Maybe.Nothing(),
    })
  }



  handleClearTransaction() {
    this.setState({
      userApproval: false,
      txn: Maybe.Nothing(),
      stx: Maybe.Nothing(),
    })
  }



  handleSubmit(){
    const { props, state } = this
    sendSignedTransaction(props.web3.value, state.stx)
      .then(sent => {
        props.setTxnCursor(sent)
        props.popRoute()
        props.pushRoute(ROUTE_NAMES.SENT_TRANSACTION)
      })
      .catch(err => {
        // Note that value.value is due to wrapped Maybe.Just + Result.Error
        this.setState({ txError: Maybe.Just(err.value.value) })
      })
  }



  createUnsignedTxn() {
    const { state, props } = this

    const validContracts = props.contracts.matchWith({
      Just: (cs) => cs.value,
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_CONTRACTS
      }
    })

    const validPoint = props.pointCursor.matchWith({
      Just: (shp) => shp.value,
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_POINT
      }
    })

    const hexRegExp = /[0-9A-Fa-f]{64}/g

    if (hexRegExp.test(state.networkSeed)) {
      // derive network keys
      const pair = kg.deriveNetworkKeys(state.networkSeed)

      const pencr = addHexPrefix(pair.crypt.public)
      const pauth = addHexPrefix(pair.auth.public)

      const txn = azimuth.ecliptic.configureKeys(
        validContracts,
        validPoint,
        pencr,
        pauth,
        1,
        false
      )

      return Maybe.Just(txn)
    }

    return Maybe.Nothing()
  }

  render() {
    const { props, state } = this

    const canGenerate =
         state.networkSeed.length === 64

    const canSign = Maybe.Just.hasInstance(state.txn)
    const canApprove = Maybe.Just.hasInstance(state.stx)

    const canSend =
         Maybe.Just.hasInstance(state.stx)
      && state.userApproval === true

    const pointDetails =
        state.point in props.pointCache
      ? props.pointCache[state.point]
      : (() => { throw BRIDGE_ERROR.MISSING_POINT })()


    return (
      <Row>
        <Col>
          <H1>
            { 'Set Network Keys For ' } <code>{ `${ob.patp(state.point)}` }</code>
          </H1>

          <P>
          {
            `Please enter a network seed for generating and setting your public
             network authentication and encryption keys.  Your network seed
             must be a 32-byte-long hexadecimal string.`
          }
          </P>
          <P>
          {
             `If you've authenticated with a master ticket or management proxy
              mnemonic, a seed will be generated for you automatically.`
          }
          </P>

          { pointDetails.keyRevisionNumber === '0'
            ? <Warning>
                <h3 className={'mb-2'}>{'Warning'}</h3>
                {
                  'Once these keys have been set, your Urbit is considered ' +
                  "'Linked'.  This operation cannot be undone."
                }
              </Warning>
            : <div /> }

          <Form>
            <RequiredInput
              className='mono'
              prop-size='lg'
              prop-format='innerLabel'
              value={ state.networkSeed }
              onChange={ this.handleNetworkSeedInput }>
              <InnerLabel>{ 'Network seed' }</InnerLabel>
            </RequiredInput>

            <StatelessTransaction
              // Upper scope
              web3={props.web3}
              contracts={props.contracts}
              wallet={props.wallet}
              walletType={props.walletType}
              // Tx
              txn={state.txn}
              stx={state.stx}
              // Tx details
              nonce={state.nonce}
              gasPrice={state.gasPrice}
              chainId={state.chainId}
              gasLimit={state.gasLimit}
              // Checks
              userApproval={state.userApproval}
              canGenerate={ canGenerate }
              canSign={ canSign }
              canApprove={ canApprove }
              canSend={ canSend }
              // Methods
              createUnsignedTxn={this.handleCreateUnsignedTxn}
              setUserApproval={this.handleSetUserApproval}
              setTxn={this.handleSetTxn}
              setStx={this.handleSetStx}
              setNonce={this.handleSetNonce}
              setChainId={this.handleSetChainId}
              setGasPrice={this.handleSetGasPrice}
              setGasLimit={this.handleSetGasLimit}
              handleSubmit={this.handleSubmit} />

              {
                Maybe.Nothing.hasInstance(state.txError)
                  ? ''
                  : <Warning className={'mt-8'}>
                      <H3 style={{marginTop: 0, paddingTop: 0}}>
                        {
                          'There was an error sending your transaction.'
                        }
                      </H3>
                      { state.txError.value }
                  </Warning>
              }

          </Form>

        </Col>
      </Row>
    )
  }
}

export default SetKeys
