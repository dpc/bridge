import Maybe from 'folktale/maybe'
import React from 'react'
import { Button } from '../components/Base'
import { InnerLabel, ValidatedSigil, PointInput, ShardInput } from '../components/Base'
import { Row, Col, H1, P, Form } from '../components/Base'
import * as kg from '../../node_modules/urbit-key-generation/dist/index'
import * as ob from 'urbit-ob'

import { ROUTE_NAMES } from '../lib/router'
import { DEFAULT_HD_PATH, walletFromMnemonic } from '../lib/wallet'

const placeholder = (len) => {
  let bytes = window.crypto.getRandomValues(new Uint8Array(len))
  let hex = bytes.reduce((acc, byt) =>
    acc + byt.toString(16).padStart(2, '0'),
    ''
  )
  return ob.hex2patq(hex)
}

const SHARDS = {
  SHARD1: Symbol('SHARD1'),
  SHARD2: Symbol('SHARD2'),
  SHARD3: Symbol('SHARD3')
}

class Shards extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      shard1: '',
      shard2: '',
      shard3: '',
      pointName: ''
    }

    this.pointPlaceholder = placeholder(4)
    this.ticketPlaceholder = placeholder(16)

    this.handleShardInput = this.handleShardInput.bind(this)
    this.handlePointNameInput = this.handlePointNameInput.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleShardInput(shard, input) {
    if (shard === SHARDS.SHARD1) {
      this.setState({ shard1: input })
    } else if (shard === SHARDS.SHARD2) {
      this.setState({ shard2: input })
    } else if (shard === SHARDS.SHARD3) {
      this.setState({ shard3: input })
    }
  }

  handlePointNameInput(pointName) {
    if (pointName.length < 15) {
      this.setState({ pointName })
    }
  }

  // buttonTriState = (wallet) => {
  //   if (wallet.isNothing()) return 'blue'
  //   if (wallet === false) return 'yellow'
  //   if (Maybe.Nothing.hasInstance(wallet)) return 'green'
  // }

  async walletFromShards(shard1, shard2, shard3, pointName) {
    const { setWallet, setUrbitWallet } = this.props

    const s1 = shard1 === '' ? undefined : shard1
    const s2 = shard2 === '' ? undefined : shard2
    const s3 = shard3 === '' ? undefined : shard3

    let ticket = undefined
    try {
      ticket = kg.combine([s1, s2, s3])
    } catch(_) {
      // do nothing
    }

    if (ticket !== undefined) {
      const urbitWallet = await kg.generateWallet({
        ticket: ticket,
        ship: ob.patp2dec(pointName)
      })
      const mnemonic = urbitWallet.ownership.seed
      const wallet = walletFromMnemonic(mnemonic, DEFAULT_HD_PATH)
      setWallet(wallet)
      setUrbitWallet(Maybe.Just(urbitWallet))
    }
  }

  handleSubmit() {
    const { props, state } = this
    this.walletFromShards(
      state.shard1,
      state.shard2,
      state.shard3,
      state.pointName
    ).then(() => {
      props.popRoute()
      props.pushRoute(ROUTE_NAMES.SHIPS)
    })
  }

  render() {

    const { props, state } = this

    const phPoint = this.pointPlaceholder
    const phTick = this.ticketPlaceholder

    const shards = [state.shard1, state.shard2, state.shard3]
    const ready = shards.filter(x => x !== '').length > 1

    return (
        <Row>
          <Col>
            <H1>{ 'Authenticate' }</H1>

            <P>
            {
              `Enter your point and at least two of your three Urbit master
              ticket shards here. The index of the input field needs to
              match the index of the shard.`
            }

            </P>

          <Form>

            <PointInput
              className='mono mt-8'
              prop-size='lg'
              prop-format='innerLabel'
              type='text'
              autoFocus
              placeholder={ `e.g. ${phPoint}` }
              value={ state.pointName }
              onChange={ this.handlePointNameInput }>
              <InnerLabel>{ 'Point' }</InnerLabel>
              <ValidatedSigil
                className={'tr-0 mt-05 mr-0 abs'}
                patp={state.pointName}
                size={76}
                margin={8} />
            </PointInput>


            <ShardInput
              className='mono mt-8'
              prop-size='md'
              prop-format='innerLabel'
              type='text'
              name='shard1'
              placeholder={ `e.g. ${phTick}` }
              value={ state.shard1 }
              onChange={ inp => this.handleShardInput(SHARDS.SHARD1, inp) }>
              <InnerLabel>{ 'Shard 1' }</InnerLabel>
            </ShardInput>

            <ShardInput
              className='mono mt-8'
              prop-size='md'
              prop-format='innerLabel'
              type='text'
              name='shard2'
              placeholder={ `e.g. ${phTick}` }
              value={ state.shard2 }
              onChange={ inp => this.handleShardInput(SHARDS.SHARD2, inp) }>
              <InnerLabel>{ 'Shard 2' }</InnerLabel>
            </ShardInput>

            <ShardInput
              className='mono mt-8'
              prop-size='md'
              prop-format='innerLabel'
              type='text'
              name='shard3'
              placeholder={ `e.g. ${phTick}` }
              value={ state.shard3 }
              onChange={ inp => this.handleShardInput(SHARDS.SHARD3, inp) }>
              <InnerLabel>{ 'Shard 3' }</InnerLabel>
            </ShardInput>

            <Row className={'mt-8 '}>
              <Button
                disabled={ !ready }
                prop-size={'lg wide'}
                onClick={ this.handleSubmit }>
                { 'Unlock →' }
              </Button>

              <Button
                prop-type={'link'}
                className={'mt-8'}
                onClick={ () => props.popRoute() }>
                { '← Back' }
              </Button>
            </Row>

          </Form>
        </Col>
      </Row>
    )
  }
}

export default Shards
