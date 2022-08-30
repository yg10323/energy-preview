import { BrowserRouter, Switch, Route, Redirect } from 'react-router-dom'
import HomePage from 'src/modules/custom/Home'

const App = () => {
  return (
    <BrowserRouter>
      <Switch>
        <Redirect exact from='/' to='/home' />
        <Route path='/home' component={HomePage} />
      </Switch>
    </BrowserRouter>
  )
}

export default App