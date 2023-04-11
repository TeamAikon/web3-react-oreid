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
    return {
      account: await this.getAccount(),
      chainId: await this.getChainId(),
    };
  }

  public async getProvider(): Promise<any> {
    return new OreIdProviderEip1193(this.oreId);
  }

  public async getChainId(): Promise<string | number> {
    const oreIdAccount = await this.getOreIdAccount();
    const chainId = chainNameIdMappings[oreIdAccount.chainNetwork];
    return chainId;
  }
 
  public async getAccount(): Promise<string | null> {
    const oreIdAccount = await this.getOreIdAccount();
    return oreIdAccount.chainAccount;
  }

  public deactivate(): void {
    this.oreId.logout();
  }

  private async getOreIdAccount(): Promise<UserChainAccount> {
    if (!this.oreId) {
      throw new Error("OreId connector is not activated.");
    }

    const userData = await this.oreId.auth.user.getData();

    const oreIdAccount = userData.chainAccounts.find(
      (chainAccount) =>
        !chainAccount.chainAccount.includes("ore") &&
        !chainAccount.defaultPermission.privateKeyStoredExterally &&
        this.supportedChainIds?.includes(chainNameIdMappings[chainAccount.chainNetwork])
    );

    if (!oreIdAccount) {
      throw new Error("This user's account's chain ids are not supported.");
    }

    return oreIdAccount;
  }
}
