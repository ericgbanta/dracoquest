import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';
import { requestPersistentStorage } from './ui/install';

requestPersistentStorage();

render(<App />, document.getElementById('app')!);
