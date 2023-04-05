import { AbstractConnector } from "@web3-react/abstract-connector";
import { ConnectorUpdate } from "@web3-react/types";

import { AuthProvider, OreIdOptions, UserChainAccount, OreId } from "oreid-js";

import OreIdProviderEip1193 from "oreid-provider";

interface OreIdConnectorArguments {
  oreIdOptions: OreIdOptions;
  authProvider: AuthProvider;
  supportedChainIds: number[];
}

interface ChainNameIdMapping {
  [chainName: string]: number;
}

const chainNameIdMappings: ChainNameIdMapping = {
  mainnet: 1,
  ropsten: 3,
  rinkeby: 4,
  eth_goerli: 5,
  matic: 137,
  matic_mumbai: 80001,
};

export class OreIdConnector extends AbstractConnector {
  private readonly oreIdOptions: OreIdOptions;
  private readonly authProvider: AuthProvider;

  public oreId!: OreId;

  constructor({
    oreIdOptions,
    authProvider,
    supportedChainIds,
  }: OreIdConnectorArguments) {
    super({ supportedChainIds });
    this.oreIdOptions = oreIdOptions;
    this.authProvider = authProvider;
  }

  public async activate(): Promise<ConnectorUpdate> {
    if (!this.oreId) {
      const OreIdSDK = await import("oreid-js").then((m) => m?.default ?? m);
      this.oreId = new OreIdSDK.OreId(this.oreIdOptions);
      await this.oreId.init();
    }

    await this.oreId.popup.auth({ provider: this.authProvider });
    const activeUser = await this.getActiveUser();
    const chainId = chainNameIdMappings[activeUser.chainNetwork];
    return { account: activeUser.chainAccount, chainId: chainId };
  }

  public async getProvider(): Promise<any> {
    return new OreIdProviderEip1193(this.oreId);
  }

  public async getChainId(): Promise<string | number> {
    const activeUser = await this.getActiveUser();
    const chainId = chainNameIdMappings[activeUser.chainNetwork];
    return chainId;
  }

  public async getAccount(): Promise<string | null> {
    const activeUser = await this.getActiveUser();
    return activeUser.chainAccount;
  }

  public deactivate(): void {
    this.oreId.logout();
  }

  private async getActiveUser(): Promise<UserChainAccount> {
    if (!this.oreId) {
      throw new Error("OreId connector is not activated.");
    }

    const userData = await this.oreId.auth.user.getData();

    const activeUser = userData.chainAccounts.find(
      (chainAccount: { chainAccount: string | string[] }) =>
        !chainAccount.chainAccount.includes("ore")
    );

    if (!activeUser) {
      throw new Error("No active user found.");
    }

    return activeUser;
  }
}
