import { render } from 'preact';
import { App } from './ui/App';
import '@fontsource/fredoka/latin-600.css';
import './ui/styles.css';
import './ui/skin.css';
import { requestPersistentStorage } from './ui/install';
import { startPwa } from './ui/pwa';

requestPersistentStorage();
startPwa();

render(<App />, document.getElementById('app')!);
