import { BackendApi } from '../../api/BackendApi';
import { ApiHelper } from '../../helpers/apiHelper';
import { ResponseContract } from '../../helpers/responseContractHelper';

export interface Fixtures {
  backendApi: BackendApi;
  responseContract: ResponseContract;
  apiHelper: ApiHelper;
}
