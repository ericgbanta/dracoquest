import { render } from 'preact';
import { App } from './ui/App';
import './ui/styles.css';
import { requestPersistentStorage } from './ui/install';
import { startPwa } from './ui/pwa';

requestPersistentStorage();
startPwa();

render(<App />, document.getElementById('app')!);
