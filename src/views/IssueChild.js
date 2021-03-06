import Maybe from 'folktale/maybe'
import React from 'react'
import * as azimuth from 'azimuth-js'
import * as ob from 'urbit-ob'

import { Row, Col, H1, H3, P, Anchor, Warning } from '../components/Base'
import { Button, ShowBlockie, ValidatedSigil } from '../components/Base'
import { PointInput, AddressInput, Form, InnerLabel } from '../components/Base'

import StatelessTransaction from '../components/StatelessTransaction'

import { ROUTE_NAMES } from '../lib/router'
import { BRIDGE_ERROR } from '../lib/error'
import { getSpawnCandidate } from '../lib/child'
import {
  canDecodePatp,
  sendSignedTransaction,
  fromWei,
 } from '../lib/txn'

import {
  ETH_ZERO_ADDR,
  isValidAddress,
  eqAddr,
  addressFromSecp256k1Public
} from '../lib/wallet'

class IssueChild extends React.Component {
  constructor(props) {
    super(props)


    const issuingPoint = props.pointCursor.matchWith({
      Just: (pt) => parseInt(pt.value, 10),
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_POINT
      }
    })

    const getCandidate = () => ob.patp(getSpawnCandidate(issuingPoint))

    const suggestions = [
      getCandidate(),
      getCandidate(),
      getCandidate(),
      getCandidate()
    ]

    this.state = {
      txError: Maybe.Nothing(),
      receivingAddress: '',
      issuingPoint: issuingPoint,
      desiredPoint: '',
      isAvailable: Maybe.Nothing(), // allow attempt when offline
      userApproval: false,
      nonce: '',
      gasPrice: '5',
      chainId: '',
      gasLimit: '600000',
      txn: Maybe.Nothing(),
      stx: Maybe.Nothing(),
      suggestions: suggestions,
    }

    this.handlePointInput = this.handlePointInput.bind(this)
    this.handleAddressInput = this.handleAddressInput.bind(this)
    this.handleConfirmAvailability = this.handleConfirmAvailability.bind(this)
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



  handleAddressInput = (receivingAddress) => {
    this.setState({ receivingAddress })
    this.handleClearTxn()
  }



  handlePointInput(desiredPoint) {
    if (desiredPoint.length < 15) {
      this.setState({
        desiredPoint,
        isAvailable: Maybe.Nothing()
      })
      this.handleClearTxn()
    }
  }



  handleConfirmAvailability() {
    this.confirmPointAvailability().then(r => {
      this.setState({
        isAvailable: r,
      })
    })

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



  async confirmPointAvailability() {
    const { state, props } = this

    if (canDecodePatp(state.desiredPoint) === false) return Maybe.Just(false)

    const validContracts = props.contracts.matchWith({
      Just: (cs) => cs.value,
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_CONTRACTS
      }
    })

    const pointDec = ob.patp2dec(state.desiredPoint)

    const owner = await azimuth.azimuth.getOwner(
      validContracts,
      pointDec
    )

    if (eqAddr(owner, ETH_ZERO_ADDR)) return Maybe.Just(true)

    return Maybe.Just(false)
  }



  createUnsignedTxn() {
    const { state, props } = this

    if (isValidAddress(state.receivingAddress) === false) return Maybe.Nothing()
    if (state.isAvailable === false) return Maybe.Nothing()
    if (canDecodePatp(state.desiredPoint) === false) return Maybe.Nothing()

    const validContracts = props.contracts.matchWith({
      Just: (cs) => cs.value,
      Nothing: () => {
        throw BRIDGE_ERROR.MISSING_CONTRACTS
      }
    })

    const pointDec = ob.patp2dec(state.desiredPoint)

    const txn = azimuth.ecliptic.spawn(
      validContracts,
      pointDec,
      state.receivingAddress
    )

    return Maybe.Just(txn)
  }



  buttonTriState() {
    const a = this.state.isAvailable
    if (Maybe.Nothing.hasInstance(a)) return 'blue'
    if (a.value === false) return 'yellow'
    if (a.value === true) return 'green'
  }



  buttonTriStateText() {
    const a = this.state.isAvailable
    if (Maybe.Nothing.hasInstance(a)) return 'Confirm Availablility'
    if (a.value === false) return 'Point is Not Available'
    if (a.value === true) return 'Available'
  }

  validatePoint = patp => {
    const point = this.point

    let vpatp = false
    try {
      vpatp = ob.isValidPatp(patp)
    } catch(_) {
    }

    let vchild = false
    try {
      vchild = ob.sein(patp) === ob.patp(point)
    } catch(_) {
    }

    return vpatp && vchild
  }


  render() {
    const { props, state } = this



    const validAddress = isValidAddress(state.receivingAddress)
    const validPoint = canDecodePatp(state.desiredPoint)

    const canGenerate = props.web3.matchWith({
      Nothing: () => {
        return validAddress === true &&
        validPoint === true
      },
      Just: () => {
        return validAddress === true &&
          validPoint === true &&
          state.isAvailable.value === true
      }
    })


    const canSign = !Maybe.Nothing.hasInstance(state.txn)
    const canApprove = !Maybe.Nothing.hasInstance(state.stx)
    const canSend = !Maybe.Nothing.hasInstance(state.stx) && state.userApproval === true

    return (
      <Row>
        <Col>
          <H1>
            { 'Issue a Child From ' } <code>{ `${ob.patp(state.issuingPoint)}` }</code>
          </H1>


          <P>
          {
            `Please enter the point you would like to issue, and specify the
            receiving Ethereum address.  If you need to create an address, you
            can also use Wallet Generator.`
          }
          </P>

          <P>
          {
            `Your point can only issue children with particular names. Some
            valid suggestions for `
          }
            {
              <code>
                { ob.patp(state.issuingPoint) }
              </code>
            }
            {
              ' are '
            }
              <code>
                { state.suggestions[0] }
              </code>
          { ', ' }
              <code>
                { state.suggestions[1] }
              </code>
          { ', and ' }
              <code>
                { state.suggestions[2] }
              </code>
          { '.' }
          </P>

          <Form>
            <PointInput
              prop-size='lg'
              prop-format='innerLabel'
              className={'mono mt-8'}
              placeholder={ `e.g. ${state.suggestions[3]}` }
              value={ state.desiredPoint }
              onChange={ this.handlePointInput }>
              <InnerLabel>{ 'Point to Issue' }</InnerLabel>
              <ValidatedSigil
                className={'tr-0 mt-05 mr-0 abs'}
                patp={state.desiredPoint}
                size={76}
                margin={8}
                validator={() => this.validatePoint(state.desiredPoint)} />
            </PointInput>

            <AddressInput
              className='text-mono mt-8'
              prop-size='lg'
              prop-format='innerLabel'
              placeholder={ `e.g. 0x84295d5e054d8cff5a22428b195f5a1615bd644f` }
              value={ state.receivingAddress }
              disabled={ !state.available }
              onChange={ v => this.handleAddressInput(v) }>
              <InnerLabel>{ 'Receiving Address' }</InnerLabel>
              <ShowBlockie className={'mt-1'} address={state.receivingAddress} />
            </AddressInput>

            <Anchor
              className={'mt-1'}
              prop-size={'sm'}
              prop-disabled={!isValidAddress(state.receivingAddress)}
              target={'_blank'}
              href={`https://etherscan.io/address/${state.receivingAddress}`}>
                {'View on Etherscan ↗'}
            </Anchor>

            {
              props.web3.matchWith({
                Nothing: _ => <div />,
                Just: _ =>
                <Button
                  prop-size='lg wide'
                  prop-color={this.buttonTriState()}
                  className={'mt-8'}
                  disabled={!validPoint}
                  onClick={this.handleConfirmAvailability}>
                  {this.buttonTriStateText()}
                </Button>
              })
            }

            <StatelessTransaction
              // Upper scope
              web3={props.web3}
              contracts={props.contracts}
              wallet={props.wallet}
              walletType={props.walletType}
              walletHdPath={props.walletHdPath}
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

          </Form>

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
        </Col>
      </Row>
    )
  }
}

export default IssueChild
