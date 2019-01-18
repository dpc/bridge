import Maybe from 'folktale/maybe'
import React from 'react'
import { Button } from '../components/Base'
import { InnerLabel, ValidatedSigil, PointInput, TicketInput } from '../components/Base'
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

class Ticket extends React.Component {

  constructor(props) {
    super(props)

    this.state = {
      ticket: '',
      pointName: ''
    }

    this.pointPlaceholder = placeholder(4)
    this.ticketPlaceholder = placeholder(8)

    this.handleTicketInput = this.handleTicketInput.bind(this)
    this.handlePointNameInput = this.handlePointNameInput.bind(this)
    this.handleSubmit = this.handleSubmit.bind(this)
  }

  handleTicketInput(ticket) {
    this.setState({ ticket })
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

  async walletFromTicket(ticket, pointName) {
    const { setWallet, setUrbitWallet } = this.props
    const urbitWallet = await kg.generateWallet({
      ticket: ticket,
      ship: ob.patp2dec(pointName)
    })
    const mnemonic = urbitWallet.ownership.seed
    const wallet = walletFromMnemonic(mnemonic, DEFAULT_HD_PATH)
    setWallet(wallet)
    setUrbitWallet(Maybe.Just(urbitWallet))
  }

  handleSubmit() {
    const { props, state } = this
    this.walletFromTicket(state.ticket, state.pointName).then(() => {
      props.popRoute()
      props.pushRoute(ROUTE_NAMES.SHIPS)
    })
  }

  render() {
    const { props, state } = this

    const validTicket = true
    const validShip = true
    const canSubmit = validTicket === true && validShip === true


    return (
        <Row>
          <Col>
            <H1>{ 'Authenticate' }</H1>

            <P>
            { `Please enter your point and Urbit master ticket here. This information is written on your Urbit HD paper wallets.` }
            </P>

          <Form>

            <PointInput
              className='mono mt-8'
              prop-size='lg'
              prop-format='innerLabel'
              type='text'
              autoFocus
              placeholder={ `e.g. ${this.pointPlaceholder}` }
              value={ state.pointName }
              onChange={ this.handlePointNameInput }>
              <InnerLabel>{ 'Point' }</InnerLabel>
              <ValidatedSigil
                className={'tr-0 mt-05 mr-0 abs'}
                patp={state.pointName}
                size={76}
                margin={8} />
            </PointInput>


            <TicketInput
              className='mono mt-8'
              prop-size='md'
              prop-format='innerLabel'
              type='text'
              name='ticket'
              placeholder={ `e.g. ${this.ticketPlaceholder}` }
              value={ state.ticket }
              onChange={ this.handleTicketInput }>
              <InnerLabel>{ 'Ticket' }</InnerLabel>
            </TicketInput>

            <Row className={'mt-8 '}>
              <Button
                prop-size={'lg wide'}
                disabled={ !canSubmit }
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

export default Ticket
