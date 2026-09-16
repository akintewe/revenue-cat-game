import { NativeModule, requireNativeModule } from 'expo';

declare class AndroidInstalledGamesModule extends NativeModule<{}> {
  getInstalledPackages(packages: string[]): Promise<string[]>;
}

export default requireNativeModule<AndroidInstalledGamesModule>('AndroidInstalledGames');
