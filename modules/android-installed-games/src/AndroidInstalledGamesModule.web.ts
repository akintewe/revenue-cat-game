import { registerWebModule, NativeModule } from 'expo';

class AndroidInstalledGamesModule extends NativeModule<{}> {}

export default registerWebModule(AndroidInstalledGamesModule, 'AndroidInstalledGamesModule');
