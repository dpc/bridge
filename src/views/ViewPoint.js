import Maybe from 'folktale/maybe'
import React from 'react'
import * as ob from 'urbit-ob'

import { Button } from '../components/Base'
import { Row, Col, H1, P } from '../components/Base'
import { InnerLabel, PointInput, ValidatedSigil, Form } from '../components/Base'

import { ROUTE_NAMES } from '../lib/router'

class ViewPoint extends React.Component {
  constructor(props) {
    super(props)

    this.state = {
      pointName: ''
    }

    this.handlePointInput = this.handlePointInput.bind(this)
  }

  handlePointInput = (pointName) => {
    if (pointName.length < 15) {
      this.setState({ pointName })
    }
  }

  render() {
    const { pointName } = this.state
    const { popRoute, pushRoute, setPointCursor } = this.props

    // NB (jtobin):
    //
    // could use a better patp parser in urbit-ob
    let valid
    try {
      valid = ob.isValidPatp(pointName)
    } catch(err) {
      valid = false
    }

    return (
      <Row>
        <Col>
          <H1>{ 'View a Point' }</H1>

          <P>
          { "Enter a point name to view its public information." }
          </P>

          <Form>
            <PointInput
              autoFocus
              prop-size='lg'
              prop-format='innerLabel'
              className='mono'
              placeholder='e.g. ~zod'
              onChange={ this.handlePointInput }
              value={pointName}>
              <InnerLabel>{'Point Name'}</InnerLabel>
              <ValidatedSigil
                className={'tr-0 mt-05 mr-0 abs'}
                patp={pointName}
                show
                size={76}
                margin={8} />
            </PointInput>

            <Button
              className={'mt-8'}
              disabled={ valid === false }
              onClick={
                () => {
                  setPointCursor(Maybe.Just(ob.patp2dec(pointName)))
                  popRoute()
                  pushRoute(ROUTE_NAMES.SHIP)
                }
              }
            >
              { 'Continue  →' }
            </Button>
          </Form>
        </Col>
      </Row>
    )
  }

}

export default ViewPoint
