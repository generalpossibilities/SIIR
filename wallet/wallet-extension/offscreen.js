var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/@tvmsdk/core/dist/modules.js
var require_modules = __commonJS({
  "node_modules/@tvmsdk/core/dist/modules.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.builderOpCell = exports.builderOpBitString = exports.builderOpInteger = exports.bocCacheTypeUnpinned = exports.bocCacheTypePinned = exports.AbiModule = exports.DataLayout = exports.MessageBodyType = exports.signerSigningBox = exports.signerKeys = exports.signerExternal = exports.signerNone = exports.abiSerialized = exports.abiHandle = exports.abiJson = exports.abiContract = exports.AbiErrorCode = exports.CryptoModule = exports.resultOfAppEncryptionBoxDecrypt = exports.resultOfAppEncryptionBoxEncrypt = exports.resultOfAppEncryptionBoxGetInfo = exports.paramsOfAppEncryptionBoxDecrypt = exports.paramsOfAppEncryptionBoxEncrypt = exports.paramsOfAppEncryptionBoxGetInfo = exports.resultOfAppSigningBoxSign = exports.resultOfAppSigningBoxGetPublicKey = exports.paramsOfAppSigningBoxSign = exports.paramsOfAppSigningBoxGetPublicKey = exports.resultOfAppPasswordProviderGetPassword = exports.paramsOfAppPasswordProviderGetPassword = exports.MnemonicDictionary = exports.boxEncryptionAlgorithmNaclSecretBox = exports.boxEncryptionAlgorithmNaclBox = exports.boxEncryptionAlgorithmChaCha20 = exports.cryptoBoxSecretEncryptedSecret = exports.cryptoBoxSecretPredefinedSeedPhrase = exports.cryptoBoxSecretRandomSeedPhrase = exports.CipherMode = exports.encryptionAlgorithmNaclSecretBox = exports.encryptionAlgorithmNaclBox = exports.encryptionAlgorithmChaCha20 = exports.encryptionAlgorithmAES = exports.CryptoErrorCode = exports.AccountModule = exports.AccountErrorCode = exports.ClientModule = exports.appRequestResultOk = exports.appRequestResultError = exports.NetworkQueriesProtocol = exports.ClientErrorCode = void 0;
    exports.paramsOfAppDebotBrowserGetSigningBox = exports.paramsOfAppDebotBrowserInput = exports.paramsOfAppDebotBrowserShowAction = exports.paramsOfAppDebotBrowserSwitchCompleted = exports.paramsOfAppDebotBrowserSwitch = exports.paramsOfAppDebotBrowserLog = exports.debotActivityTransaction = exports.DebotErrorCode = exports.NetModule = exports.AggregationFn = exports.paramsOfQueryOperationQueryCounterparties = exports.paramsOfQueryOperationAggregateCollection = exports.paramsOfQueryOperationWaitForCollection = exports.paramsOfQueryOperationQueryCollection = exports.SortDirection = exports.NetErrorCode = exports.TvmModule = exports.accountForExecutorAccount = exports.accountForExecutorUninit = exports.accountForExecutorNone = exports.TvmErrorCode = exports.UtilsModule = exports.AccountAddressType = exports.addressStringFormatBase64 = exports.addressStringFormatHex = exports.addressStringFormatAccountId = exports.ProcessingModule = exports.MessageMonitoringStatus = exports.monitoredMessageHashAddress = exports.monitoredMessageBoc = exports.MonitorFetchWaitMode = exports.processingEventRempError = exports.processingEventRempOther = exports.processingEventRempIncludedIntoAcceptedBlock = exports.processingEventRempIncludedIntoBlock = exports.processingEventRempSentToValidators = exports.processingEventMessageExpired = exports.processingEventFetchNextBlockFailed = exports.processingEventWillFetchNextBlock = exports.processingEventSendFailed = exports.processingEventDidSend = exports.processingEventWillSend = exports.processingEventFetchFirstBlockFailed = exports.processingEventWillFetchFirstBlock = exports.ProcessingErrorCode = exports.BocModule = exports.BocErrorCode = exports.tvcV1 = exports.builderOpAddress = exports.builderOpCellBoc = void 0;
    exports.ProofsModule = exports.ProofsErrorCode = exports.DebotModule = exports.resultOfAppDebotBrowserApprove = exports.resultOfAppDebotBrowserInvokeDebot = exports.resultOfAppDebotBrowserGetSigningBox = exports.resultOfAppDebotBrowserInput = exports.paramsOfAppDebotBrowserApprove = exports.paramsOfAppDebotBrowserSend = exports.paramsOfAppDebotBrowserInvokeDebot = void 0;
    var ClientErrorCode;
    (function(ClientErrorCode2) {
      ClientErrorCode2[ClientErrorCode2["NotImplemented"] = 1] = "NotImplemented";
      ClientErrorCode2[ClientErrorCode2["InvalidHex"] = 2] = "InvalidHex";
      ClientErrorCode2[ClientErrorCode2["InvalidBase64"] = 3] = "InvalidBase64";
      ClientErrorCode2[ClientErrorCode2["InvalidAddress"] = 4] = "InvalidAddress";
      ClientErrorCode2[ClientErrorCode2["CallbackParamsCantBeConvertedToJson"] = 5] = "CallbackParamsCantBeConvertedToJson";
      ClientErrorCode2[ClientErrorCode2["WebsocketConnectError"] = 6] = "WebsocketConnectError";
      ClientErrorCode2[ClientErrorCode2["WebsocketReceiveError"] = 7] = "WebsocketReceiveError";
      ClientErrorCode2[ClientErrorCode2["WebsocketSendError"] = 8] = "WebsocketSendError";
      ClientErrorCode2[ClientErrorCode2["HttpClientCreateError"] = 9] = "HttpClientCreateError";
      ClientErrorCode2[ClientErrorCode2["HttpRequestCreateError"] = 10] = "HttpRequestCreateError";
      ClientErrorCode2[ClientErrorCode2["HttpRequestSendError"] = 11] = "HttpRequestSendError";
      ClientErrorCode2[ClientErrorCode2["HttpRequestParseError"] = 12] = "HttpRequestParseError";
      ClientErrorCode2[ClientErrorCode2["CallbackNotRegistered"] = 13] = "CallbackNotRegistered";
      ClientErrorCode2[ClientErrorCode2["NetModuleNotInit"] = 14] = "NetModuleNotInit";
      ClientErrorCode2[ClientErrorCode2["InvalidConfig"] = 15] = "InvalidConfig";
      ClientErrorCode2[ClientErrorCode2["CannotCreateRuntime"] = 16] = "CannotCreateRuntime";
      ClientErrorCode2[ClientErrorCode2["InvalidContextHandle"] = 17] = "InvalidContextHandle";
      ClientErrorCode2[ClientErrorCode2["CannotSerializeResult"] = 18] = "CannotSerializeResult";
      ClientErrorCode2[ClientErrorCode2["CannotSerializeError"] = 19] = "CannotSerializeError";
      ClientErrorCode2[ClientErrorCode2["CannotConvertJsValueToJson"] = 20] = "CannotConvertJsValueToJson";
      ClientErrorCode2[ClientErrorCode2["CannotReceiveSpawnedResult"] = 21] = "CannotReceiveSpawnedResult";
      ClientErrorCode2[ClientErrorCode2["SetTimerError"] = 22] = "SetTimerError";
      ClientErrorCode2[ClientErrorCode2["InvalidParams"] = 23] = "InvalidParams";
      ClientErrorCode2[ClientErrorCode2["ContractsAddressConversionFailed"] = 24] = "ContractsAddressConversionFailed";
      ClientErrorCode2[ClientErrorCode2["UnknownFunction"] = 25] = "UnknownFunction";
      ClientErrorCode2[ClientErrorCode2["AppRequestError"] = 26] = "AppRequestError";
      ClientErrorCode2[ClientErrorCode2["NoSuchRequest"] = 27] = "NoSuchRequest";
      ClientErrorCode2[ClientErrorCode2["CanNotSendRequestResult"] = 28] = "CanNotSendRequestResult";
      ClientErrorCode2[ClientErrorCode2["CanNotReceiveRequestResult"] = 29] = "CanNotReceiveRequestResult";
      ClientErrorCode2[ClientErrorCode2["CanNotParseRequestResult"] = 30] = "CanNotParseRequestResult";
      ClientErrorCode2[ClientErrorCode2["UnexpectedCallbackResponse"] = 31] = "UnexpectedCallbackResponse";
      ClientErrorCode2[ClientErrorCode2["CanNotParseNumber"] = 32] = "CanNotParseNumber";
      ClientErrorCode2[ClientErrorCode2["InternalError"] = 33] = "InternalError";
      ClientErrorCode2[ClientErrorCode2["InvalidHandle"] = 34] = "InvalidHandle";
      ClientErrorCode2[ClientErrorCode2["LocalStorageError"] = 35] = "LocalStorageError";
      ClientErrorCode2[ClientErrorCode2["InvalidData"] = 36] = "InvalidData";
    })(ClientErrorCode = exports.ClientErrorCode || (exports.ClientErrorCode = {}));
    var NetworkQueriesProtocol;
    (function(NetworkQueriesProtocol2) {
      NetworkQueriesProtocol2["HTTP"] = "HTTP";
      NetworkQueriesProtocol2["WS"] = "WS";
    })(NetworkQueriesProtocol = exports.NetworkQueriesProtocol || (exports.NetworkQueriesProtocol = {}));
    function appRequestResultError(text) {
      return {
        type: "Error",
        text
      };
    }
    exports.appRequestResultError = appRequestResultError;
    function appRequestResultOk(result) {
      return {
        type: "Ok",
        result
      };
    }
    exports.appRequestResultOk = appRequestResultOk;
    var ClientModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Returns Core Library API reference
       * @returns ResultOfGetApiReference
       */
      get_api_reference() {
        return this.client.request("client.get_api_reference");
      }
      /**
       * Returns Core Library API reference
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ResultOfGetApiReference
       */
      get_api_reference_sync() {
        return this.client.requestSync("client.get_api_reference");
      }
      /**
       * Returns Core Library version
       * @returns ResultOfVersion
       */
      version() {
        return this.client.request("client.version");
      }
      /**
       * Returns Core Library version
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ResultOfVersion
       */
      version_sync() {
        return this.client.requestSync("client.version");
      }
      /**
       * Returns Core Library API reference
       * @returns ClientConfig
       */
      config() {
        return this.client.request("client.config");
      }
      /**
       * Returns Core Library API reference
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ClientConfig
       */
      config_sync() {
        return this.client.requestSync("client.config");
      }
      /**
       * Returns detailed information about this build.
       * @returns ResultOfBuildInfo
       */
      build_info() {
        return this.client.request("client.build_info");
      }
      /**
       * Returns detailed information about this build.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ResultOfBuildInfo
       */
      build_info_sync() {
        return this.client.requestSync("client.build_info");
      }
      /**
       * Resolves application request processing result
       *
       * @param {ParamsOfResolveAppRequest} params
       * @returns
       */
      resolve_app_request(params) {
        return this.client.request("client.resolve_app_request", params);
      }
      /**
       * Resolves application request processing result
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfResolveAppRequest} params
       * @returns
       */
      resolve_app_request_sync(params) {
        this.client.requestSync("client.resolve_app_request", params);
      }
    };
    exports.ClientModule = ClientModule;
    var AccountErrorCode;
    (function(AccountErrorCode2) {
      AccountErrorCode2[AccountErrorCode2["NotImplemented"] = 1] = "NotImplemented";
      AccountErrorCode2[AccountErrorCode2["InvalidHex"] = 2] = "InvalidHex";
      AccountErrorCode2[AccountErrorCode2["InvalidBase64"] = 3] = "InvalidBase64";
      AccountErrorCode2[AccountErrorCode2["InvalidAddress"] = 4] = "InvalidAddress";
      AccountErrorCode2[AccountErrorCode2["CallbackParamsCantBeConvertedToJson"] = 5] = "CallbackParamsCantBeConvertedToJson";
      AccountErrorCode2[AccountErrorCode2["WebsocketConnectError"] = 6] = "WebsocketConnectError";
      AccountErrorCode2[AccountErrorCode2["WebsocketReceiveError"] = 7] = "WebsocketReceiveError";
      AccountErrorCode2[AccountErrorCode2["WebsocketSendError"] = 8] = "WebsocketSendError";
      AccountErrorCode2[AccountErrorCode2["HttpClientCreateError"] = 9] = "HttpClientCreateError";
      AccountErrorCode2[AccountErrorCode2["HttpRequestCreateError"] = 10] = "HttpRequestCreateError";
      AccountErrorCode2[AccountErrorCode2["HttpRequestSendError"] = 11] = "HttpRequestSendError";
      AccountErrorCode2[AccountErrorCode2["HttpRequestParseError"] = 12] = "HttpRequestParseError";
      AccountErrorCode2[AccountErrorCode2["CallbackNotRegistered"] = 13] = "CallbackNotRegistered";
      AccountErrorCode2[AccountErrorCode2["NetModuleNotInit"] = 14] = "NetModuleNotInit";
      AccountErrorCode2[AccountErrorCode2["InvalidConfig"] = 15] = "InvalidConfig";
      AccountErrorCode2[AccountErrorCode2["CannotCreateRuntime"] = 16] = "CannotCreateRuntime";
      AccountErrorCode2[AccountErrorCode2["InvalidContextHandle"] = 17] = "InvalidContextHandle";
      AccountErrorCode2[AccountErrorCode2["CannotSerializeResult"] = 18] = "CannotSerializeResult";
      AccountErrorCode2[AccountErrorCode2["CannotSerializeError"] = 19] = "CannotSerializeError";
      AccountErrorCode2[AccountErrorCode2["CannotConvertJsValueToJson"] = 20] = "CannotConvertJsValueToJson";
      AccountErrorCode2[AccountErrorCode2["CannotReceiveSpawnedResult"] = 21] = "CannotReceiveSpawnedResult";
      AccountErrorCode2[AccountErrorCode2["SetTimerError"] = 22] = "SetTimerError";
      AccountErrorCode2[AccountErrorCode2["InvalidParams"] = 23] = "InvalidParams";
      AccountErrorCode2[AccountErrorCode2["ContractsAddressConversionFailed"] = 24] = "ContractsAddressConversionFailed";
      AccountErrorCode2[AccountErrorCode2["UnknownFunction"] = 25] = "UnknownFunction";
      AccountErrorCode2[AccountErrorCode2["AppRequestError"] = 26] = "AppRequestError";
      AccountErrorCode2[AccountErrorCode2["NoSuchRequest"] = 27] = "NoSuchRequest";
      AccountErrorCode2[AccountErrorCode2["CanNotSendRequestResult"] = 28] = "CanNotSendRequestResult";
      AccountErrorCode2[AccountErrorCode2["CanNotReceiveRequestResult"] = 29] = "CanNotReceiveRequestResult";
      AccountErrorCode2[AccountErrorCode2["CanNotParseRequestResult"] = 30] = "CanNotParseRequestResult";
      AccountErrorCode2[AccountErrorCode2["UnexpectedCallbackResponse"] = 31] = "UnexpectedCallbackResponse";
      AccountErrorCode2[AccountErrorCode2["CanNotParseNumber"] = 32] = "CanNotParseNumber";
      AccountErrorCode2[AccountErrorCode2["InternalError"] = 33] = "InternalError";
      AccountErrorCode2[AccountErrorCode2["InvalidHandle"] = 34] = "InvalidHandle";
      AccountErrorCode2[AccountErrorCode2["LocalStorageError"] = 35] = "LocalStorageError";
      AccountErrorCode2[AccountErrorCode2["InvalidData"] = 36] = "InvalidData";
    })(AccountErrorCode = exports.AccountErrorCode || (exports.AccountErrorCode = {}));
    var AccountModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       *
       * @param {ParamsOfGetAccount} params
       * @returns ResultOfGetAccount
       */
      get_account(params) {
        return this.client.request("account.get_account", params);
      }
      /**
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetAccount} params
       * @returns ResultOfGetAccount
       */
      get_account_sync(params) {
        return this.client.requestSync("account.get_account", params);
      }
    };
    exports.AccountModule = AccountModule;
    var CryptoErrorCode;
    (function(CryptoErrorCode2) {
      CryptoErrorCode2[CryptoErrorCode2["InvalidPublicKey"] = 100] = "InvalidPublicKey";
      CryptoErrorCode2[CryptoErrorCode2["InvalidSecretKey"] = 101] = "InvalidSecretKey";
      CryptoErrorCode2[CryptoErrorCode2["InvalidKey"] = 102] = "InvalidKey";
      CryptoErrorCode2[CryptoErrorCode2["InvalidFactorizeChallenge"] = 106] = "InvalidFactorizeChallenge";
      CryptoErrorCode2[CryptoErrorCode2["InvalidBigInt"] = 107] = "InvalidBigInt";
      CryptoErrorCode2[CryptoErrorCode2["ScryptFailed"] = 108] = "ScryptFailed";
      CryptoErrorCode2[CryptoErrorCode2["InvalidKeySize"] = 109] = "InvalidKeySize";
      CryptoErrorCode2[CryptoErrorCode2["NaclSecretBoxFailed"] = 110] = "NaclSecretBoxFailed";
      CryptoErrorCode2[CryptoErrorCode2["NaclBoxFailed"] = 111] = "NaclBoxFailed";
      CryptoErrorCode2[CryptoErrorCode2["NaclSignFailed"] = 112] = "NaclSignFailed";
      CryptoErrorCode2[CryptoErrorCode2["Bip39InvalidEntropy"] = 113] = "Bip39InvalidEntropy";
      CryptoErrorCode2[CryptoErrorCode2["Bip39InvalidPhrase"] = 114] = "Bip39InvalidPhrase";
      CryptoErrorCode2[CryptoErrorCode2["Bip32InvalidKey"] = 115] = "Bip32InvalidKey";
      CryptoErrorCode2[CryptoErrorCode2["Bip32InvalidDerivePath"] = 116] = "Bip32InvalidDerivePath";
      CryptoErrorCode2[CryptoErrorCode2["Bip39InvalidDictionary"] = 117] = "Bip39InvalidDictionary";
      CryptoErrorCode2[CryptoErrorCode2["Bip39InvalidWordCount"] = 118] = "Bip39InvalidWordCount";
      CryptoErrorCode2[CryptoErrorCode2["MnemonicGenerationFailed"] = 119] = "MnemonicGenerationFailed";
      CryptoErrorCode2[CryptoErrorCode2["MnemonicFromEntropyFailed"] = 120] = "MnemonicFromEntropyFailed";
      CryptoErrorCode2[CryptoErrorCode2["SigningBoxNotRegistered"] = 121] = "SigningBoxNotRegistered";
      CryptoErrorCode2[CryptoErrorCode2["InvalidSignature"] = 122] = "InvalidSignature";
      CryptoErrorCode2[CryptoErrorCode2["EncryptionBoxNotRegistered"] = 123] = "EncryptionBoxNotRegistered";
      CryptoErrorCode2[CryptoErrorCode2["InvalidIvSize"] = 124] = "InvalidIvSize";
      CryptoErrorCode2[CryptoErrorCode2["UnsupportedCipherMode"] = 125] = "UnsupportedCipherMode";
      CryptoErrorCode2[CryptoErrorCode2["CannotCreateCipher"] = 126] = "CannotCreateCipher";
      CryptoErrorCode2[CryptoErrorCode2["EncryptDataError"] = 127] = "EncryptDataError";
      CryptoErrorCode2[CryptoErrorCode2["DecryptDataError"] = 128] = "DecryptDataError";
      CryptoErrorCode2[CryptoErrorCode2["IvRequired"] = 129] = "IvRequired";
      CryptoErrorCode2[CryptoErrorCode2["CryptoBoxNotRegistered"] = 130] = "CryptoBoxNotRegistered";
      CryptoErrorCode2[CryptoErrorCode2["InvalidCryptoBoxType"] = 131] = "InvalidCryptoBoxType";
      CryptoErrorCode2[CryptoErrorCode2["CryptoBoxSecretSerializationError"] = 132] = "CryptoBoxSecretSerializationError";
      CryptoErrorCode2[CryptoErrorCode2["CryptoBoxSecretDeserializationError"] = 133] = "CryptoBoxSecretDeserializationError";
      CryptoErrorCode2[CryptoErrorCode2["InvalidNonceSize"] = 134] = "InvalidNonceSize";
    })(CryptoErrorCode = exports.CryptoErrorCode || (exports.CryptoErrorCode = {}));
    function encryptionAlgorithmAES(value) {
      return {
        type: "AES",
        value
      };
    }
    exports.encryptionAlgorithmAES = encryptionAlgorithmAES;
    function encryptionAlgorithmChaCha20(value) {
      return {
        type: "ChaCha20",
        value
      };
    }
    exports.encryptionAlgorithmChaCha20 = encryptionAlgorithmChaCha20;
    function encryptionAlgorithmNaclBox(value) {
      return {
        type: "NaclBox",
        value
      };
    }
    exports.encryptionAlgorithmNaclBox = encryptionAlgorithmNaclBox;
    function encryptionAlgorithmNaclSecretBox(value) {
      return {
        type: "NaclSecretBox",
        value
      };
    }
    exports.encryptionAlgorithmNaclSecretBox = encryptionAlgorithmNaclSecretBox;
    var CipherMode;
    (function(CipherMode2) {
      CipherMode2["CBC"] = "CBC";
      CipherMode2["CFB"] = "CFB";
      CipherMode2["CTR"] = "CTR";
      CipherMode2["ECB"] = "ECB";
      CipherMode2["OFB"] = "OFB";
    })(CipherMode = exports.CipherMode || (exports.CipherMode = {}));
    function cryptoBoxSecretRandomSeedPhrase(dictionary, wordcount) {
      return {
        type: "RandomSeedPhrase",
        dictionary,
        wordcount
      };
    }
    exports.cryptoBoxSecretRandomSeedPhrase = cryptoBoxSecretRandomSeedPhrase;
    function cryptoBoxSecretPredefinedSeedPhrase(phrase, dictionary, wordcount) {
      return {
        type: "PredefinedSeedPhrase",
        phrase,
        dictionary,
        wordcount
      };
    }
    exports.cryptoBoxSecretPredefinedSeedPhrase = cryptoBoxSecretPredefinedSeedPhrase;
    function cryptoBoxSecretEncryptedSecret(encrypted_secret) {
      return {
        type: "EncryptedSecret",
        encrypted_secret
      };
    }
    exports.cryptoBoxSecretEncryptedSecret = cryptoBoxSecretEncryptedSecret;
    function boxEncryptionAlgorithmChaCha20(value) {
      return {
        type: "ChaCha20",
        value
      };
    }
    exports.boxEncryptionAlgorithmChaCha20 = boxEncryptionAlgorithmChaCha20;
    function boxEncryptionAlgorithmNaclBox(value) {
      return {
        type: "NaclBox",
        value
      };
    }
    exports.boxEncryptionAlgorithmNaclBox = boxEncryptionAlgorithmNaclBox;
    function boxEncryptionAlgorithmNaclSecretBox(value) {
      return {
        type: "NaclSecretBox",
        value
      };
    }
    exports.boxEncryptionAlgorithmNaclSecretBox = boxEncryptionAlgorithmNaclSecretBox;
    var MnemonicDictionary;
    (function(MnemonicDictionary2) {
      MnemonicDictionary2[MnemonicDictionary2["Ton"] = 0] = "Ton";
      MnemonicDictionary2[MnemonicDictionary2["English"] = 1] = "English";
      MnemonicDictionary2[MnemonicDictionary2["ChineseSimplified"] = 2] = "ChineseSimplified";
      MnemonicDictionary2[MnemonicDictionary2["ChineseTraditional"] = 3] = "ChineseTraditional";
      MnemonicDictionary2[MnemonicDictionary2["French"] = 4] = "French";
      MnemonicDictionary2[MnemonicDictionary2["Italian"] = 5] = "Italian";
      MnemonicDictionary2[MnemonicDictionary2["Japanese"] = 6] = "Japanese";
      MnemonicDictionary2[MnemonicDictionary2["Korean"] = 7] = "Korean";
      MnemonicDictionary2[MnemonicDictionary2["Spanish"] = 8] = "Spanish";
    })(MnemonicDictionary = exports.MnemonicDictionary || (exports.MnemonicDictionary = {}));
    function paramsOfAppPasswordProviderGetPassword(encryption_public_key) {
      return {
        type: "GetPassword",
        encryption_public_key
      };
    }
    exports.paramsOfAppPasswordProviderGetPassword = paramsOfAppPasswordProviderGetPassword;
    function resultOfAppPasswordProviderGetPassword(encrypted_password, app_encryption_pubkey) {
      return {
        type: "GetPassword",
        encrypted_password,
        app_encryption_pubkey
      };
    }
    exports.resultOfAppPasswordProviderGetPassword = resultOfAppPasswordProviderGetPassword;
    function paramsOfAppSigningBoxGetPublicKey() {
      return {
        type: "GetPublicKey"
      };
    }
    exports.paramsOfAppSigningBoxGetPublicKey = paramsOfAppSigningBoxGetPublicKey;
    function paramsOfAppSigningBoxSign(unsigned) {
      return {
        type: "Sign",
        unsigned
      };
    }
    exports.paramsOfAppSigningBoxSign = paramsOfAppSigningBoxSign;
    function resultOfAppSigningBoxGetPublicKey(public_key) {
      return {
        type: "GetPublicKey",
        public_key
      };
    }
    exports.resultOfAppSigningBoxGetPublicKey = resultOfAppSigningBoxGetPublicKey;
    function resultOfAppSigningBoxSign(signature) {
      return {
        type: "Sign",
        signature
      };
    }
    exports.resultOfAppSigningBoxSign = resultOfAppSigningBoxSign;
    function paramsOfAppEncryptionBoxGetInfo() {
      return {
        type: "GetInfo"
      };
    }
    exports.paramsOfAppEncryptionBoxGetInfo = paramsOfAppEncryptionBoxGetInfo;
    function paramsOfAppEncryptionBoxEncrypt(data) {
      return {
        type: "Encrypt",
        data
      };
    }
    exports.paramsOfAppEncryptionBoxEncrypt = paramsOfAppEncryptionBoxEncrypt;
    function paramsOfAppEncryptionBoxDecrypt(data) {
      return {
        type: "Decrypt",
        data
      };
    }
    exports.paramsOfAppEncryptionBoxDecrypt = paramsOfAppEncryptionBoxDecrypt;
    function resultOfAppEncryptionBoxGetInfo(info) {
      return {
        type: "GetInfo",
        info
      };
    }
    exports.resultOfAppEncryptionBoxGetInfo = resultOfAppEncryptionBoxGetInfo;
    function resultOfAppEncryptionBoxEncrypt(data) {
      return {
        type: "Encrypt",
        data
      };
    }
    exports.resultOfAppEncryptionBoxEncrypt = resultOfAppEncryptionBoxEncrypt;
    function resultOfAppEncryptionBoxDecrypt(data) {
      return {
        type: "Decrypt",
        data
      };
    }
    exports.resultOfAppEncryptionBoxDecrypt = resultOfAppEncryptionBoxDecrypt;
    function dispatchAppPasswordProvider(obj, params, app_request_id, client2) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let result = {};
          switch (params.type) {
            case "GetPassword":
              result = yield obj.get_password(params);
              break;
          }
          client2.resolve_app_request(app_request_id, Object.assign({ type: params.type }, result));
        } catch (error) {
          client2.reject_app_request(app_request_id, error);
        }
      });
    }
    function dispatchAppSigningBox(obj, params, app_request_id, client2) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let result = {};
          switch (params.type) {
            case "GetPublicKey":
              result = yield obj.get_public_key();
              break;
            case "Sign":
              result = yield obj.sign(params);
              break;
          }
          client2.resolve_app_request(app_request_id, Object.assign({ type: params.type }, result));
        } catch (error) {
          client2.reject_app_request(app_request_id, error);
        }
      });
    }
    function dispatchAppEncryptionBox(obj, params, app_request_id, client2) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let result = {};
          switch (params.type) {
            case "GetInfo":
              result = yield obj.get_info();
              break;
            case "Encrypt":
              result = yield obj.encrypt(params);
              break;
            case "Decrypt":
              result = yield obj.decrypt(params);
              break;
          }
          client2.resolve_app_request(app_request_id, Object.assign({ type: params.type }, result));
        } catch (error) {
          client2.reject_app_request(app_request_id, error);
        }
      });
    }
    var CryptoModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Integer factorization
       *
       * @remarks
       * Performs prime factorization – decomposition of a composite number
       * into a product of smaller prime integers (factors).
       * See [https://en.wikipedia.org/wiki/Integer_factorization]
       *
       * @param {ParamsOfFactorize} params
       * @returns ResultOfFactorize
       */
      factorize(params) {
        return this.client.request("crypto.factorize", params);
      }
      /**
       * Integer factorization
       *
       * @remarks
       * Performs prime factorization – decomposition of a composite number
       * into a product of smaller prime integers (factors).
       * See [https://en.wikipedia.org/wiki/Integer_factorization]
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfFactorize} params
       * @returns ResultOfFactorize
       */
      factorize_sync(params) {
        return this.client.requestSync("crypto.factorize", params);
      }
      /**
       * Modular exponentiation
       *
       * @remarks
       * Performs modular exponentiation for big integers (`base`^`exponent` mod
       * `modulus`). See [https://en.wikipedia.org/wiki/Modular_exponentiation]
       *
       * @param {ParamsOfModularPower} params
       * @returns ResultOfModularPower
       */
      modular_power(params) {
        return this.client.request("crypto.modular_power", params);
      }
      /**
       * Modular exponentiation
       *
       * @remarks
       * Performs modular exponentiation for big integers (`base`^`exponent` mod
       * `modulus`). See [https://en.wikipedia.org/wiki/Modular_exponentiation]
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfModularPower} params
       * @returns ResultOfModularPower
       */
      modular_power_sync(params) {
        return this.client.requestSync("crypto.modular_power", params);
      }
      /**
       * Calculates CRC16 using TON algorithm.
       *
       * @param {ParamsOfTonCrc16} params
       * @returns ResultOfTonCrc16
       */
      tvm_crc16(params) {
        return this.client.request("crypto.tvm_crc16", params);
      }
      /**
       * Calculates CRC16 using TON algorithm.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfTonCrc16} params
       * @returns ResultOfTonCrc16
       */
      tvm_crc16_sync(params) {
        return this.client.requestSync("crypto.tvm_crc16", params);
      }
      /**
       * Generates random byte array of the specified length and returns it in `base64` format
       *
       * @param {ParamsOfGenerateRandomBytes} params
       * @returns ResultOfGenerateRandomBytes
       */
      generate_random_bytes(params) {
        return this.client.request("crypto.generate_random_bytes", params);
      }
      /**
       * Generates random byte array of the specified length and returns it in `base64` format
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGenerateRandomBytes} params
       * @returns ResultOfGenerateRandomBytes
       */
      generate_random_bytes_sync(params) {
        return this.client.requestSync("crypto.generate_random_bytes", params);
      }
      /**
       * Converts public key to ton safe_format
       *
       * @param {ParamsOfConvertPublicKeyToTonSafeFormat} params
       * @returns ResultOfConvertPublicKeyToTonSafeFormat
       */
      convert_public_key_to_tvm_safe_format(params) {
        return this.client.request("crypto.convert_public_key_to_tvm_safe_format", params);
      }
      /**
       * Converts public key to ton safe_format
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfConvertPublicKeyToTonSafeFormat} params
       * @returns ResultOfConvertPublicKeyToTonSafeFormat
       */
      convert_public_key_to_tvm_safe_format_sync(params) {
        return this.client.requestSync("crypto.convert_public_key_to_tvm_safe_format", params);
      }
      /**
       * Generates random ed25519 key pair.
       * @returns KeyPair
       */
      generate_random_sign_keys() {
        return this.client.request("crypto.generate_random_sign_keys");
      }
      /**
       * Generates random ed25519 key pair.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns KeyPair
       */
      generate_random_sign_keys_sync() {
        return this.client.requestSync("crypto.generate_random_sign_keys");
      }
      /**
       * Signs a data using the provided keys.
       *
       * @param {ParamsOfSign} params
       * @returns ResultOfSign
       */
      sign(params) {
        return this.client.request("crypto.sign", params);
      }
      /**
       * Signs a data using the provided keys.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSign} params
       * @returns ResultOfSign
       */
      sign_sync(params) {
        return this.client.requestSync("crypto.sign", params);
      }
      /**
       * Verifies signed data using the provided public key. Raises error if verification is failed.
       *
       * @param {ParamsOfVerifySignature} params
       * @returns ResultOfVerifySignature
       */
      verify_signature(params) {
        return this.client.request("crypto.verify_signature", params);
      }
      /**
       * Verifies signed data using the provided public key. Raises error if verification is failed.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfVerifySignature} params
       * @returns ResultOfVerifySignature
       */
      verify_signature_sync(params) {
        return this.client.requestSync("crypto.verify_signature", params);
      }
      /**
       * Calculates SHA256 hash of the specified data.
       *
       * @param {ParamsOfHash} params
       * @returns ResultOfHash
       */
      sha256(params) {
        return this.client.request("crypto.sha256", params);
      }
      /**
       * Calculates SHA256 hash of the specified data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHash} params
       * @returns ResultOfHash
       */
      sha256_sync(params) {
        return this.client.requestSync("crypto.sha256", params);
      }
      /**
       * Calculates SHA512 hash of the specified data.
       *
       * @param {ParamsOfHash} params
       * @returns ResultOfHash
       */
      sha512(params) {
        return this.client.request("crypto.sha512", params);
      }
      /**
       * Calculates SHA512 hash of the specified data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHash} params
       * @returns ResultOfHash
       */
      sha512_sync(params) {
        return this.client.requestSync("crypto.sha512", params);
      }
      /**
       * Perform `scrypt` encryption
       *
       * @remarks
       * Derives key from `password` and `key` using `scrypt` algorithm.
       * See [https://en.wikipedia.org/wiki/Scrypt].
       *
       * # Arguments
       * - `log_n` - The log2 of the Scrypt parameter `N`
       * - `r` - The Scrypt parameter `r`
       * - `p` - The Scrypt parameter `p`
       * # Conditions
       * - `log_n` must be less than `64`
       * - `r` must be greater than `0` and less than or equal to `4294967295`
       * - `p` must be greater than `0` and less than `4294967295`
       * # Recommended values sufficient for most use-cases
       * - `log_n = 15` (`n = 32768`)
       * - `r = 8`
       * - `p = 1`
       *
       * @param {ParamsOfScrypt} params
       * @returns ResultOfScrypt
       */
      scrypt(params) {
        return this.client.request("crypto.scrypt", params);
      }
      /**
       * Perform `scrypt` encryption
       *
       * @remarks
       * Derives key from `password` and `key` using `scrypt` algorithm.
       * See [https://en.wikipedia.org/wiki/Scrypt].
       *
       * # Arguments
       * - `log_n` - The log2 of the Scrypt parameter `N`
       * - `r` - The Scrypt parameter `r`
       * - `p` - The Scrypt parameter `p`
       * # Conditions
       * - `log_n` must be less than `64`
       * - `r` must be greater than `0` and less than or equal to `4294967295`
       * - `p` must be greater than `0` and less than `4294967295`
       * # Recommended values sufficient for most use-cases
       * - `log_n = 15` (`n = 32768`)
       * - `r = 8`
       * - `p = 1`
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfScrypt} params
       * @returns ResultOfScrypt
       */
      scrypt_sync(params) {
        return this.client.requestSync("crypto.scrypt", params);
      }
      /**
       * Generates a key pair for signing from the secret key
       *
       * @remarks
       * **NOTE:** In the result the secret key is actually the concatenation
       * of secret and public keys (128 symbols hex string) by design of [NaCL](http://nacl.cr.yp.to/sign.html).
       * See also [the stackexchange question](https://crypto.stackexchange.com/questions/54353/).
       *
       * @param {ParamsOfNaclSignKeyPairFromSecret} params
       * @returns KeyPair
       */
      nacl_sign_keypair_from_secret_key(params) {
        return this.client.request("crypto.nacl_sign_keypair_from_secret_key", params);
      }
      /**
       * Generates a key pair for signing from the secret key
       *
       * @remarks
       * **NOTE:** In the result the secret key is actually the concatenation
       * of secret and public keys (128 symbols hex string) by design of [NaCL](http://nacl.cr.yp.to/sign.html).
       * See also [the stackexchange question](https://crypto.stackexchange.com/questions/54353/).
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSignKeyPairFromSecret} params
       * @returns KeyPair
       */
      nacl_sign_keypair_from_secret_key_sync(params) {
        return this.client.requestSync("crypto.nacl_sign_keypair_from_secret_key", params);
      }
      /**
       * Signs data using the signer's secret key.
       *
       * @param {ParamsOfNaclSign} params
       * @returns ResultOfNaclSign
       */
      nacl_sign(params) {
        return this.client.request("crypto.nacl_sign", params);
      }
      /**
       * Signs data using the signer's secret key.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSign} params
       * @returns ResultOfNaclSign
       */
      nacl_sign_sync(params) {
        return this.client.requestSync("crypto.nacl_sign", params);
      }
      /**
       * Verifies the signature and returns the unsigned message
       *
       * @remarks
       * Verifies the signature in `signed` using the signer's public key `public`
       * and returns the message `unsigned`.
       *
       * If the signature fails verification, crypto_sign_open raises an exception.
       *
       * @param {ParamsOfNaclSignOpen} params
       * @returns ResultOfNaclSignOpen
       */
      nacl_sign_open(params) {
        return this.client.request("crypto.nacl_sign_open", params);
      }
      /**
       * Verifies the signature and returns the unsigned message
       *
       * @remarks
       * Verifies the signature in `signed` using the signer's public key `public`
       * and returns the message `unsigned`.
       *
       * If the signature fails verification, crypto_sign_open raises an exception.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSignOpen} params
       * @returns ResultOfNaclSignOpen
       */
      nacl_sign_open_sync(params) {
        return this.client.requestSync("crypto.nacl_sign_open", params);
      }
      /**
       * Signs the message using the secret key and returns a signature.
       *
       * @remarks
       * Signs the message `unsigned` using the secret key `secret`
       * and returns a signature `signature`.
       *
       * @param {ParamsOfNaclSign} params
       * @returns ResultOfNaclSignDetached
       */
      nacl_sign_detached(params) {
        return this.client.request("crypto.nacl_sign_detached", params);
      }
      /**
       * Signs the message using the secret key and returns a signature.
       *
       * @remarks
       * Signs the message `unsigned` using the secret key `secret`
       * and returns a signature `signature`.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSign} params
       * @returns ResultOfNaclSignDetached
       */
      nacl_sign_detached_sync(params) {
        return this.client.requestSync("crypto.nacl_sign_detached", params);
      }
      /**
       * Verifies the signature with public key and `unsigned` data.
       *
       * @param {ParamsOfNaclSignDetachedVerify} params
       * @returns ResultOfNaclSignDetachedVerify
       */
      nacl_sign_detached_verify(params) {
        return this.client.request("crypto.nacl_sign_detached_verify", params);
      }
      /**
       * Verifies the signature with public key and `unsigned` data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSignDetachedVerify} params
       * @returns ResultOfNaclSignDetachedVerify
       */
      nacl_sign_detached_verify_sync(params) {
        return this.client.requestSync("crypto.nacl_sign_detached_verify", params);
      }
      /**
       * Generates a random NaCl key pair
       * @returns KeyPair
       */
      nacl_box_keypair() {
        return this.client.request("crypto.nacl_box_keypair");
      }
      /**
       * Generates a random NaCl key pair
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns KeyPair
       */
      nacl_box_keypair_sync() {
        return this.client.requestSync("crypto.nacl_box_keypair");
      }
      /**
       * Generates key pair from a secret key
       *
       * @param {ParamsOfNaclBoxKeyPairFromSecret} params
       * @returns KeyPair
       */
      nacl_box_keypair_from_secret_key(params) {
        return this.client.request("crypto.nacl_box_keypair_from_secret_key", params);
      }
      /**
       * Generates key pair from a secret key
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclBoxKeyPairFromSecret} params
       * @returns KeyPair
       */
      nacl_box_keypair_from_secret_key_sync(params) {
        return this.client.requestSync("crypto.nacl_box_keypair_from_secret_key", params);
      }
      /**
       * Public key authenticated encryption
       *
       * @remarks
       * Encrypt and authenticate a message using the senders secret key, the
       * receivers public key, and a nonce.
       *
       * @param {ParamsOfNaclBox} params
       * @returns ResultOfNaclBox
       */
      nacl_box(params) {
        return this.client.request("crypto.nacl_box", params);
      }
      /**
       * Public key authenticated encryption
       *
       * @remarks
       * Encrypt and authenticate a message using the senders secret key, the
       * receivers public key, and a nonce.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclBox} params
       * @returns ResultOfNaclBox
       */
      nacl_box_sync(params) {
        return this.client.requestSync("crypto.nacl_box", params);
      }
      /**
       * Decrypt and verify the cipher text using the receivers secret key, the senders public key, and the nonce.
       *
       * @param {ParamsOfNaclBoxOpen} params
       * @returns ResultOfNaclBoxOpen
       */
      nacl_box_open(params) {
        return this.client.request("crypto.nacl_box_open", params);
      }
      /**
       * Decrypt and verify the cipher text using the receivers secret key, the senders public key, and the nonce.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclBoxOpen} params
       * @returns ResultOfNaclBoxOpen
       */
      nacl_box_open_sync(params) {
        return this.client.requestSync("crypto.nacl_box_open", params);
      }
      /**
       * Encrypt and authenticate message using nonce and secret key.
       *
       * @param {ParamsOfNaclSecretBox} params
       * @returns ResultOfNaclBox
       */
      nacl_secret_box(params) {
        return this.client.request("crypto.nacl_secret_box", params);
      }
      /**
       * Encrypt and authenticate message using nonce and secret key.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSecretBox} params
       * @returns ResultOfNaclBox
       */
      nacl_secret_box_sync(params) {
        return this.client.requestSync("crypto.nacl_secret_box", params);
      }
      /**
       * Decrypts and verifies cipher text using `nonce` and secret `key`.
       *
       * @param {ParamsOfNaclSecretBoxOpen} params
       * @returns ResultOfNaclBoxOpen
       */
      nacl_secret_box_open(params) {
        return this.client.request("crypto.nacl_secret_box_open", params);
      }
      /**
       * Decrypts and verifies cipher text using `nonce` and secret `key`.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfNaclSecretBoxOpen} params
       * @returns ResultOfNaclBoxOpen
       */
      nacl_secret_box_open_sync(params) {
        return this.client.requestSync("crypto.nacl_secret_box_open", params);
      }
      /**
       * Prints the list of words from the specified dictionary
       *
       * @param {ParamsOfMnemonicWords} params
       * @returns ResultOfMnemonicWords
       */
      mnemonic_words(params) {
        return this.client.request("crypto.mnemonic_words", params);
      }
      /**
       * Prints the list of words from the specified dictionary
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMnemonicWords} params
       * @returns ResultOfMnemonicWords
       */
      mnemonic_words_sync(params) {
        return this.client.requestSync("crypto.mnemonic_words", params);
      }
      /**
       * Generates a random mnemonic
       *
       * @remarks
       * Generates a random mnemonic from the specified dictionary and word count
       *
       * @param {ParamsOfMnemonicFromRandom} params
       * @returns ResultOfMnemonicFromRandom
       */
      mnemonic_from_random(params) {
        return this.client.request("crypto.mnemonic_from_random", params);
      }
      /**
       * Generates a random mnemonic
       *
       * @remarks
       * Generates a random mnemonic from the specified dictionary and word count
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMnemonicFromRandom} params
       * @returns ResultOfMnemonicFromRandom
       */
      mnemonic_from_random_sync(params) {
        return this.client.requestSync("crypto.mnemonic_from_random", params);
      }
      /**
       * Generates mnemonic from pre-generated entropy
       *
       * @param {ParamsOfMnemonicFromEntropy} params
       * @returns ResultOfMnemonicFromEntropy
       */
      mnemonic_from_entropy(params) {
        return this.client.request("crypto.mnemonic_from_entropy", params);
      }
      /**
       * Generates mnemonic from pre-generated entropy
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMnemonicFromEntropy} params
       * @returns ResultOfMnemonicFromEntropy
       */
      mnemonic_from_entropy_sync(params) {
        return this.client.requestSync("crypto.mnemonic_from_entropy", params);
      }
      /**
       * Validates a mnemonic phrase
       *
       * @remarks
       * The phrase supplied will be checked for word length and validated according
       * to the checksum specified in BIP0039.
       *
       * @param {ParamsOfMnemonicVerify} params
       * @returns ResultOfMnemonicVerify
       */
      mnemonic_verify(params) {
        return this.client.request("crypto.mnemonic_verify", params);
      }
      /**
       * Validates a mnemonic phrase
       *
       * @remarks
       * The phrase supplied will be checked for word length and validated according
       * to the checksum specified in BIP0039.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMnemonicVerify} params
       * @returns ResultOfMnemonicVerify
       */
      mnemonic_verify_sync(params) {
        return this.client.requestSync("crypto.mnemonic_verify", params);
      }
      /**
       * Derives a key pair for signing from the seed phrase
       *
       * @remarks
       * Validates the seed phrase, generates master key and then derives
       * the key pair from the master key and the specified path
       *
       * @param {ParamsOfMnemonicDeriveSignKeys} params
       * @returns KeyPair
       */
      mnemonic_derive_sign_keys(params) {
        return this.client.request("crypto.mnemonic_derive_sign_keys", params);
      }
      /**
       * Derives a key pair for signing from the seed phrase
       *
       * @remarks
       * Validates the seed phrase, generates master key and then derives
       * the key pair from the master key and the specified path
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMnemonicDeriveSignKeys} params
       * @returns KeyPair
       */
      mnemonic_derive_sign_keys_sync(params) {
        return this.client.requestSync("crypto.mnemonic_derive_sign_keys", params);
      }
      /**
       * Generates an extended master private key that will be the root for all the derived keys
       *
       * @param {ParamsOfHDKeyXPrvFromMnemonic} params
       * @returns ResultOfHDKeyXPrvFromMnemonic
       */
      hdkey_xprv_from_mnemonic(params) {
        return this.client.request("crypto.hdkey_xprv_from_mnemonic", params);
      }
      /**
       * Generates an extended master private key that will be the root for all the derived keys
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHDKeyXPrvFromMnemonic} params
       * @returns ResultOfHDKeyXPrvFromMnemonic
       */
      hdkey_xprv_from_mnemonic_sync(params) {
        return this.client.requestSync("crypto.hdkey_xprv_from_mnemonic", params);
      }
      /**
       * Returns extended private key derived from the specified extended private key and child index
       *
       * @param {ParamsOfHDKeyDeriveFromXPrv} params
       * @returns ResultOfHDKeyDeriveFromXPrv
       */
      hdkey_derive_from_xprv(params) {
        return this.client.request("crypto.hdkey_derive_from_xprv", params);
      }
      /**
       * Returns extended private key derived from the specified extended private key and child index
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHDKeyDeriveFromXPrv} params
       * @returns ResultOfHDKeyDeriveFromXPrv
       */
      hdkey_derive_from_xprv_sync(params) {
        return this.client.requestSync("crypto.hdkey_derive_from_xprv", params);
      }
      /**
       * Derives the extended private key from the specified key and path
       *
       * @param {ParamsOfHDKeyDeriveFromXPrvPath} params
       * @returns ResultOfHDKeyDeriveFromXPrvPath
       */
      hdkey_derive_from_xprv_path(params) {
        return this.client.request("crypto.hdkey_derive_from_xprv_path", params);
      }
      /**
       * Derives the extended private key from the specified key and path
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHDKeyDeriveFromXPrvPath} params
       * @returns ResultOfHDKeyDeriveFromXPrvPath
       */
      hdkey_derive_from_xprv_path_sync(params) {
        return this.client.requestSync("crypto.hdkey_derive_from_xprv_path", params);
      }
      /**
       * Extracts the private key from the serialized extended private key
       *
       * @param {ParamsOfHDKeySecretFromXPrv} params
       * @returns ResultOfHDKeySecretFromXPrv
       */
      hdkey_secret_from_xprv(params) {
        return this.client.request("crypto.hdkey_secret_from_xprv", params);
      }
      /**
       * Extracts the private key from the serialized extended private key
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHDKeySecretFromXPrv} params
       * @returns ResultOfHDKeySecretFromXPrv
       */
      hdkey_secret_from_xprv_sync(params) {
        return this.client.requestSync("crypto.hdkey_secret_from_xprv", params);
      }
      /**
       * Extracts the public key from the serialized extended private key
       *
       * @param {ParamsOfHDKeyPublicFromXPrv} params
       * @returns ResultOfHDKeyPublicFromXPrv
       */
      hdkey_public_from_xprv(params) {
        return this.client.request("crypto.hdkey_public_from_xprv", params);
      }
      /**
       * Extracts the public key from the serialized extended private key
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfHDKeyPublicFromXPrv} params
       * @returns ResultOfHDKeyPublicFromXPrv
       */
      hdkey_public_from_xprv_sync(params) {
        return this.client.requestSync("crypto.hdkey_public_from_xprv", params);
      }
      /**
       * Performs symmetric `chacha20` encryption.
       *
       * @param {ParamsOfChaCha20} params
       * @returns ResultOfChaCha20
       */
      chacha20(params) {
        return this.client.request("crypto.chacha20", params);
      }
      /**
       * Performs symmetric `chacha20` encryption.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfChaCha20} params
       * @returns ResultOfChaCha20
       */
      chacha20_sync(params) {
        return this.client.requestSync("crypto.chacha20", params);
      }
      /**
       * Creates a Crypto Box instance.
       *
       * @remarks
       * Crypto Box is a root crypto object, that encapsulates some secret (seed
       * phrase usually) in encrypted form and acts as a factory for all crypto
       * primitives used in SDK: keys for signing and encryption, derived from this
       * secret.
       *
       * Crypto Box encrypts original Seed Phrase with salt and password that is
       * retrieved from `password_provider` callback, implemented on Application
       * side.
       *
       * When used, decrypted secret shows up in core library's memory for a very
       * short period of time and then is immediately overwritten with zeroes.
       *
       * @param {ParamsOfCreateCryptoBox} params
       * @returns RegisteredCryptoBox
       */
      create_crypto_box(params, obj) {
        return this.client.request("crypto.create_crypto_box", params, (params2, responseType) => {
          if (responseType === 3) {
            dispatchAppPasswordProvider(obj, params2.request_data, params2.app_request_id, this.client);
          } else if (responseType === 4) {
            dispatchAppPasswordProvider(obj, params2, null, this.client);
          }
        });
      }
      /**
       * Creates a Crypto Box instance.
       *
       * @remarks
       * Crypto Box is a root crypto object, that encapsulates some secret (seed
       * phrase usually) in encrypted form and acts as a factory for all crypto
       * primitives used in SDK: keys for signing and encryption, derived from this
       * secret.
       *
       * Crypto Box encrypts original Seed Phrase with salt and password that is
       * retrieved from `password_provider` callback, implemented on Application
       * side.
       *
       * When used, decrypted secret shows up in core library's memory for a very
       * short period of time and then is immediately overwritten with zeroes.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCreateCryptoBox} params
       * @returns RegisteredCryptoBox
       */
      create_crypto_box_sync(params) {
        return this.client.requestSync("crypto.create_crypto_box", params);
      }
      /**
       * Removes Crypto Box. Clears all secret data.
       *
       * @param {RegisteredCryptoBox} params
       * @returns
       */
      remove_crypto_box(params) {
        return this.client.request("crypto.remove_crypto_box", params);
      }
      /**
       * Removes Crypto Box. Clears all secret data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredCryptoBox} params
       * @returns
       */
      remove_crypto_box_sync(params) {
        this.client.requestSync("crypto.remove_crypto_box", params);
      }
      /**
       * Get Crypto Box Info. Used to get `encrypted_secret` that should be used for all the cryptobox initializations except the first one.
       *
       * @param {RegisteredCryptoBox} params
       * @returns ResultOfGetCryptoBoxInfo
       */
      get_crypto_box_info(params) {
        return this.client.request("crypto.get_crypto_box_info", params);
      }
      /**
       * Get Crypto Box Info. Used to get `encrypted_secret` that should be used for all the cryptobox initializations except the first one.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredCryptoBox} params
       * @returns ResultOfGetCryptoBoxInfo
       */
      get_crypto_box_info_sync(params) {
        return this.client.requestSync("crypto.get_crypto_box_info", params);
      }
      /**
       * Get Crypto Box Seed Phrase.
       *
       * @remarks
       * Attention! Store this data in your application for a very short period of
       * time and overwrite it with zeroes ASAP.
       *
       * @param {RegisteredCryptoBox} params
       * @returns ResultOfGetCryptoBoxSeedPhrase
       */
      get_crypto_box_seed_phrase(params) {
        return this.client.request("crypto.get_crypto_box_seed_phrase", params);
      }
      /**
       * Get Crypto Box Seed Phrase.
       *
       * @remarks
       * Attention! Store this data in your application for a very short period of
       * time and overwrite it with zeroes ASAP.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredCryptoBox} params
       * @returns ResultOfGetCryptoBoxSeedPhrase
       */
      get_crypto_box_seed_phrase_sync(params) {
        return this.client.requestSync("crypto.get_crypto_box_seed_phrase", params);
      }
      /**
       * Get handle of Signing Box derived from Crypto Box.
       *
       * @param {ParamsOfGetSigningBoxFromCryptoBox} params
       * @returns RegisteredSigningBox
       */
      get_signing_box_from_crypto_box(params) {
        return this.client.request("crypto.get_signing_box_from_crypto_box", params);
      }
      /**
       * Get handle of Signing Box derived from Crypto Box.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetSigningBoxFromCryptoBox} params
       * @returns RegisteredSigningBox
       */
      get_signing_box_from_crypto_box_sync(params) {
        return this.client.requestSync("crypto.get_signing_box_from_crypto_box", params);
      }
      /**
       * Gets Encryption Box from Crypto Box.
       *
       * @remarks
       * Derives encryption keypair from cryptobox secret and hdpath and
       * stores it in cache for `secret_lifetime`
       * or until explicitly cleared by `clear_crypto_box_secret_cache` method.
       * If `secret_lifetime` is not specified - overwrites encryption secret with
       * zeroes immediately after encryption operation.
       *
       * @param {ParamsOfGetEncryptionBoxFromCryptoBox} params
       * @returns RegisteredEncryptionBox
       */
      get_encryption_box_from_crypto_box(params) {
        return this.client.request("crypto.get_encryption_box_from_crypto_box", params);
      }
      /**
       * Gets Encryption Box from Crypto Box.
       *
       * @remarks
       * Derives encryption keypair from cryptobox secret and hdpath and
       * stores it in cache for `secret_lifetime`
       * or until explicitly cleared by `clear_crypto_box_secret_cache` method.
       * If `secret_lifetime` is not specified - overwrites encryption secret with
       * zeroes immediately after encryption operation.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetEncryptionBoxFromCryptoBox} params
       * @returns RegisteredEncryptionBox
       */
      get_encryption_box_from_crypto_box_sync(params) {
        return this.client.requestSync("crypto.get_encryption_box_from_crypto_box", params);
      }
      /**
       * Removes cached secrets (overwrites with zeroes) from all signing and encryption boxes, derived from crypto box.
       *
       * @param {RegisteredCryptoBox} params
       * @returns
       */
      clear_crypto_box_secret_cache(params) {
        return this.client.request("crypto.clear_crypto_box_secret_cache", params);
      }
      /**
       * Removes cached secrets (overwrites with zeroes) from all signing and encryption boxes, derived from crypto box.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredCryptoBox} params
       * @returns
       */
      clear_crypto_box_secret_cache_sync(params) {
        this.client.requestSync("crypto.clear_crypto_box_secret_cache", params);
      }
      /**
       * Register an application implemented signing box.
       * @returns RegisteredSigningBox
       */
      register_signing_box(obj) {
        return this.client.request("crypto.register_signing_box", void 0, (params, responseType) => {
          if (responseType === 3) {
            dispatchAppSigningBox(obj, params.request_data, params.app_request_id, this.client);
          } else if (responseType === 4) {
            dispatchAppSigningBox(obj, params, null, this.client);
          }
        });
      }
      /**
       * Register an application implemented signing box.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns RegisteredSigningBox
       */
      register_signing_box_sync() {
        return this.client.requestSync("crypto.register_signing_box");
      }
      /**
       * Creates a default signing box implementation.
       *
       * @param {KeyPair} params
       * @returns RegisteredSigningBox
       */
      get_signing_box(params) {
        return this.client.request("crypto.get_signing_box", params);
      }
      /**
       * Creates a default signing box implementation.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {KeyPair} params
       * @returns RegisteredSigningBox
       */
      get_signing_box_sync(params) {
        return this.client.requestSync("crypto.get_signing_box", params);
      }
      /**
       * Returns public key of signing key pair.
       *
       * @param {RegisteredSigningBox} params
       * @returns ResultOfSigningBoxGetPublicKey
       */
      signing_box_get_public_key(params) {
        return this.client.request("crypto.signing_box_get_public_key", params);
      }
      /**
       * Returns public key of signing key pair.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredSigningBox} params
       * @returns ResultOfSigningBoxGetPublicKey
       */
      signing_box_get_public_key_sync(params) {
        return this.client.requestSync("crypto.signing_box_get_public_key", params);
      }
      /**
       * Returns signed user data.
       *
       * @param {ParamsOfSigningBoxSign} params
       * @returns ResultOfSigningBoxSign
       */
      signing_box_sign(params) {
        return this.client.request("crypto.signing_box_sign", params);
      }
      /**
       * Returns signed user data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSigningBoxSign} params
       * @returns ResultOfSigningBoxSign
       */
      signing_box_sign_sync(params) {
        return this.client.requestSync("crypto.signing_box_sign", params);
      }
      /**
       * Removes signing box from SDK.
       *
       * @param {RegisteredSigningBox} params
       * @returns
       */
      remove_signing_box(params) {
        return this.client.request("crypto.remove_signing_box", params);
      }
      /**
       * Removes signing box from SDK.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredSigningBox} params
       * @returns
       */
      remove_signing_box_sync(params) {
        this.client.requestSync("crypto.remove_signing_box", params);
      }
      /**
       * Register an application implemented encryption box.
       * @returns RegisteredEncryptionBox
       */
      register_encryption_box(obj) {
        return this.client.request("crypto.register_encryption_box", void 0, (params, responseType) => {
          if (responseType === 3) {
            dispatchAppEncryptionBox(obj, params.request_data, params.app_request_id, this.client);
          } else if (responseType === 4) {
            dispatchAppEncryptionBox(obj, params, null, this.client);
          }
        });
      }
      /**
       * Register an application implemented encryption box.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns RegisteredEncryptionBox
       */
      register_encryption_box_sync() {
        return this.client.requestSync("crypto.register_encryption_box");
      }
      /**
       * Removes encryption box from SDK
       *
       * @param {RegisteredEncryptionBox} params
       * @returns
       */
      remove_encryption_box(params) {
        return this.client.request("crypto.remove_encryption_box", params);
      }
      /**
       * Removes encryption box from SDK
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredEncryptionBox} params
       * @returns
       */
      remove_encryption_box_sync(params) {
        this.client.requestSync("crypto.remove_encryption_box", params);
      }
      /**
       * Queries info from the given encryption box
       *
       * @param {ParamsOfEncryptionBoxGetInfo} params
       * @returns ResultOfEncryptionBoxGetInfo
       */
      encryption_box_get_info(params) {
        return this.client.request("crypto.encryption_box_get_info", params);
      }
      /**
       * Queries info from the given encryption box
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncryptionBoxGetInfo} params
       * @returns ResultOfEncryptionBoxGetInfo
       */
      encryption_box_get_info_sync(params) {
        return this.client.requestSync("crypto.encryption_box_get_info", params);
      }
      /**
       * Encrypts data using given encryption box Note.
       *
       * @remarks
       * Block cipher algorithms pad data to cipher block size so encrypted data can be longer then original data. Client should store the original data
       * size after encryption and use it after decryption to retrieve the original
       * data from decrypted data.
       *
       * @param {ParamsOfEncryptionBoxEncrypt} params
       * @returns ResultOfEncryptionBoxEncrypt
       */
      encryption_box_encrypt(params) {
        return this.client.request("crypto.encryption_box_encrypt", params);
      }
      /**
       * Encrypts data using given encryption box Note.
       *
       * @remarks
       * Block cipher algorithms pad data to cipher block size so encrypted data can be longer then original data. Client should store the original data
       * size after encryption and use it after decryption to retrieve the original
       * data from decrypted data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncryptionBoxEncrypt} params
       * @returns ResultOfEncryptionBoxEncrypt
       */
      encryption_box_encrypt_sync(params) {
        return this.client.requestSync("crypto.encryption_box_encrypt", params);
      }
      /**
       * Decrypts data using given encryption box Note.
       *
       * @remarks
       * Block cipher algorithms pad data to cipher block size so encrypted data can be longer then original data. Client should store the original data
       * size after encryption and use it after decryption to retrieve the original
       * data from decrypted data.
       *
       * @param {ParamsOfEncryptionBoxDecrypt} params
       * @returns ResultOfEncryptionBoxDecrypt
       */
      encryption_box_decrypt(params) {
        return this.client.request("crypto.encryption_box_decrypt", params);
      }
      /**
       * Decrypts data using given encryption box Note.
       *
       * @remarks
       * Block cipher algorithms pad data to cipher block size so encrypted data can be longer then original data. Client should store the original data
       * size after encryption and use it after decryption to retrieve the original
       * data from decrypted data.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncryptionBoxDecrypt} params
       * @returns ResultOfEncryptionBoxDecrypt
       */
      encryption_box_decrypt_sync(params) {
        return this.client.requestSync("crypto.encryption_box_decrypt", params);
      }
      /**
       * Creates encryption box with specified algorithm
       *
       * @param {ParamsOfCreateEncryptionBox} params
       * @returns RegisteredEncryptionBox
       */
      create_encryption_box(params) {
        return this.client.request("crypto.create_encryption_box", params);
      }
      /**
       * Creates encryption box with specified algorithm
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCreateEncryptionBox} params
       * @returns RegisteredEncryptionBox
       */
      create_encryption_box_sync(params) {
        return this.client.requestSync("crypto.create_encryption_box", params);
      }
    };
    exports.CryptoModule = CryptoModule;
    var AbiErrorCode;
    (function(AbiErrorCode2) {
      AbiErrorCode2[AbiErrorCode2["RequiredAddressMissingForEncodeMessage"] = 301] = "RequiredAddressMissingForEncodeMessage";
      AbiErrorCode2[AbiErrorCode2["RequiredCallSetMissingForEncodeMessage"] = 302] = "RequiredCallSetMissingForEncodeMessage";
      AbiErrorCode2[AbiErrorCode2["InvalidJson"] = 303] = "InvalidJson";
      AbiErrorCode2[AbiErrorCode2["InvalidMessage"] = 304] = "InvalidMessage";
      AbiErrorCode2[AbiErrorCode2["EncodeDeployMessageFailed"] = 305] = "EncodeDeployMessageFailed";
      AbiErrorCode2[AbiErrorCode2["EncodeRunMessageFailed"] = 306] = "EncodeRunMessageFailed";
      AbiErrorCode2[AbiErrorCode2["AttachSignatureFailed"] = 307] = "AttachSignatureFailed";
      AbiErrorCode2[AbiErrorCode2["InvalidTvcImage"] = 308] = "InvalidTvcImage";
      AbiErrorCode2[AbiErrorCode2["RequiredPublicKeyMissingForFunctionHeader"] = 309] = "RequiredPublicKeyMissingForFunctionHeader";
      AbiErrorCode2[AbiErrorCode2["InvalidSigner"] = 310] = "InvalidSigner";
      AbiErrorCode2[AbiErrorCode2["InvalidAbi"] = 311] = "InvalidAbi";
      AbiErrorCode2[AbiErrorCode2["InvalidFunctionId"] = 312] = "InvalidFunctionId";
      AbiErrorCode2[AbiErrorCode2["InvalidData"] = 313] = "InvalidData";
      AbiErrorCode2[AbiErrorCode2["EncodeInitialDataFailed"] = 314] = "EncodeInitialDataFailed";
      AbiErrorCode2[AbiErrorCode2["InvalidFunctionName"] = 315] = "InvalidFunctionName";
      AbiErrorCode2[AbiErrorCode2["PubKeyNotSupported"] = 316] = "PubKeyNotSupported";
    })(AbiErrorCode = exports.AbiErrorCode || (exports.AbiErrorCode = {}));
    function abiContract(value) {
      return {
        type: "Contract",
        value
      };
    }
    exports.abiContract = abiContract;
    function abiJson(value) {
      return {
        type: "Json",
        value
      };
    }
    exports.abiJson = abiJson;
    function abiHandle(value) {
      return {
        type: "Handle",
        value
      };
    }
    exports.abiHandle = abiHandle;
    function abiSerialized(value) {
      return {
        type: "Serialized",
        value
      };
    }
    exports.abiSerialized = abiSerialized;
    function signerNone() {
      return {
        type: "None"
      };
    }
    exports.signerNone = signerNone;
    function signerExternal(public_key) {
      return {
        type: "External",
        public_key
      };
    }
    exports.signerExternal = signerExternal;
    function signerKeys(keys) {
      return {
        type: "Keys",
        keys
      };
    }
    exports.signerKeys = signerKeys;
    function signerSigningBox(handle2) {
      return {
        type: "SigningBox",
        handle: handle2
      };
    }
    exports.signerSigningBox = signerSigningBox;
    var MessageBodyType;
    (function(MessageBodyType2) {
      MessageBodyType2["Input"] = "Input";
      MessageBodyType2["Output"] = "Output";
      MessageBodyType2["InternalOutput"] = "InternalOutput";
      MessageBodyType2["Event"] = "Event";
    })(MessageBodyType = exports.MessageBodyType || (exports.MessageBodyType = {}));
    var DataLayout;
    (function(DataLayout2) {
      DataLayout2["Input"] = "Input";
      DataLayout2["Output"] = "Output";
    })(DataLayout = exports.DataLayout || (exports.DataLayout = {}));
    var AbiModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Encodes message body according to ABI function call.
       *
       * @param {ParamsOfEncodeMessageBody} params
       * @returns ResultOfEncodeMessageBody
       */
      encode_message_body(params) {
        return this.client.request("abi.encode_message_body", params);
      }
      /**
       * Encodes message body according to ABI function call.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeMessageBody} params
       * @returns ResultOfEncodeMessageBody
       */
      encode_message_body_sync(params) {
        return this.client.requestSync("abi.encode_message_body", params);
      }
      /**
       * Attach signature
       *
       * @param {ParamsOfAttachSignatureToMessageBody} params
       * @returns ResultOfAttachSignatureToMessageBody
       */
      attach_signature_to_message_body(params) {
        return this.client.request("abi.attach_signature_to_message_body", params);
      }
      /**
       * Attach signature
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfAttachSignatureToMessageBody} params
       * @returns ResultOfAttachSignatureToMessageBody
       */
      attach_signature_to_message_body_sync(params) {
        return this.client.requestSync("abi.attach_signature_to_message_body", params);
      }
      /**
       * Encodes an ABI-compatible message
       *
       * @remarks
       * Allows to encode deploy and function call messages,
       * both signed and unsigned.
       *
       * Use cases include messages of any possible type:
       * - deploy with initial function call (i.e. `constructor` or any other
       *   function that is used for some kind
       * of initialization);
       * - deploy without initial function call;
       * - signed/unsigned + data for signing.
       *
       * `Signer` defines how the message should or shouldn't be signed:
       *
       * `Signer::None` creates an unsigned message. This may be needed in case of
       * some public methods, that do not require authorization by pubkey.
       *
       * `Signer::External` takes public key and returns `data_to_sign` for later
       * signing. Use `attach_signature` method with the result signature to get the
       * signed message.
       *
       * `Signer::Keys` creates a signed message with provided key pair.
       *
       * [SOON] `Signer::SigningBox` Allows using a special interface to implement
       * signing without private key disclosure to SDK. For instance, in case of
       * using a cold wallet or HSM, when application calls some API to sign data.
       *
       * There is an optional public key can be provided in deploy set in order to
       * substitute one in TVM file.
       *
       * Public key resolving priority:
       * 1. Public key from deploy set.
       * 2. Public key, specified in TVM file.
       * 3. Public key, provided by signer.
       *
       * @param {ParamsOfEncodeMessage} params
       * @returns ResultOfEncodeMessage
       */
      encode_message(params) {
        return this.client.request("abi.encode_message", params);
      }
      /**
       * Encodes an ABI-compatible message
       *
       * @remarks
       * Allows to encode deploy and function call messages,
       * both signed and unsigned.
       *
       * Use cases include messages of any possible type:
       * - deploy with initial function call (i.e. `constructor` or any other
       *   function that is used for some kind
       * of initialization);
       * - deploy without initial function call;
       * - signed/unsigned + data for signing.
       *
       * `Signer` defines how the message should or shouldn't be signed:
       *
       * `Signer::None` creates an unsigned message. This may be needed in case of
       * some public methods, that do not require authorization by pubkey.
       *
       * `Signer::External` takes public key and returns `data_to_sign` for later
       * signing. Use `attach_signature` method with the result signature to get the
       * signed message.
       *
       * `Signer::Keys` creates a signed message with provided key pair.
       *
       * [SOON] `Signer::SigningBox` Allows using a special interface to implement
       * signing without private key disclosure to SDK. For instance, in case of
       * using a cold wallet or HSM, when application calls some API to sign data.
       *
       * There is an optional public key can be provided in deploy set in order to
       * substitute one in TVM file.
       *
       * Public key resolving priority:
       * 1. Public key from deploy set.
       * 2. Public key, specified in TVM file.
       * 3. Public key, provided by signer.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeMessage} params
       * @returns ResultOfEncodeMessage
       */
      encode_message_sync(params) {
        return this.client.requestSync("abi.encode_message", params);
      }
      /**
       * Encodes an internal ABI-compatible message
       *
       * @remarks
       * Allows to encode deploy and function call messages.
       *
       * Use cases include messages of any possible type:
       * - deploy with initial function call (i.e. `constructor` or any other
       *   function that is used for some kind
       * of initialization);
       * - deploy without initial function call;
       * - simple function call
       *
       * There is an optional public key can be provided in deploy set in order to
       * substitute one in TVM file.
       *
       * Public key resolving priority:
       * 1. Public key from deploy set.
       * 2. Public key, specified in TVM file.
       *
       * @param {ParamsOfEncodeInternalMessage} params
       * @returns ResultOfEncodeInternalMessage
       */
      encode_internal_message(params) {
        return this.client.request("abi.encode_internal_message", params);
      }
      /**
       * Encodes an internal ABI-compatible message
       *
       * @remarks
       * Allows to encode deploy and function call messages.
       *
       * Use cases include messages of any possible type:
       * - deploy with initial function call (i.e. `constructor` or any other
       *   function that is used for some kind
       * of initialization);
       * - deploy without initial function call;
       * - simple function call
       *
       * There is an optional public key can be provided in deploy set in order to
       * substitute one in TVM file.
       *
       * Public key resolving priority:
       * 1. Public key from deploy set.
       * 2. Public key, specified in TVM file.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeInternalMessage} params
       * @returns ResultOfEncodeInternalMessage
       */
      encode_internal_message_sync(params) {
        return this.client.requestSync("abi.encode_internal_message", params);
      }
      /**
       * Combines `hex`-encoded `signature` with `base64`-encoded `unsigned_message`. Returns signed message encoded in `base64`.
       *
       * @param {ParamsOfAttachSignature} params
       * @returns ResultOfAttachSignature
       */
      attach_signature(params) {
        return this.client.request("abi.attach_signature", params);
      }
      /**
       * Combines `hex`-encoded `signature` with `base64`-encoded `unsigned_message`. Returns signed message encoded in `base64`.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfAttachSignature} params
       * @returns ResultOfAttachSignature
       */
      attach_signature_sync(params) {
        return this.client.requestSync("abi.attach_signature", params);
      }
      /**
       * Decodes message body using provided message BOC and ABI.
       *
       * @param {ParamsOfDecodeMessage} params
       * @returns DecodedMessageBody
       */
      decode_message(params) {
        return this.client.request("abi.decode_message", params);
      }
      /**
       * Decodes message body using provided message BOC and ABI.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeMessage} params
       * @returns DecodedMessageBody
       */
      decode_message_sync(params) {
        return this.client.requestSync("abi.decode_message", params);
      }
      /**
       * Decodes message body using provided body BOC and ABI.
       *
       * @param {ParamsOfDecodeMessageBody} params
       * @returns DecodedMessageBody
       */
      decode_message_body(params) {
        return this.client.request("abi.decode_message_body", params);
      }
      /**
       * Decodes message body using provided body BOC and ABI.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeMessageBody} params
       * @returns DecodedMessageBody
       */
      decode_message_body_sync(params) {
        return this.client.requestSync("abi.decode_message_body", params);
      }
      /**
       * Creates account state BOC
       *
       * @param {ParamsOfEncodeAccount} params
       * @returns ResultOfEncodeAccount
       */
      encode_account(params) {
        return this.client.request("abi.encode_account", params);
      }
      /**
       * Creates account state BOC
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeAccount} params
       * @returns ResultOfEncodeAccount
       */
      encode_account_sync(params) {
        return this.client.requestSync("abi.encode_account", params);
      }
      /**
       * Decodes account data using provided data BOC and ABI.
       *
       * @remarks
       * Note: this feature requires ABI 2.1 or higher.
       *
       * @param {ParamsOfDecodeAccountData} params
       * @returns ResultOfDecodeAccountData
       */
      decode_account_data(params) {
        return this.client.request("abi.decode_account_data", params);
      }
      /**
       * Decodes account data using provided data BOC and ABI.
       *
       * @remarks
       * Note: this feature requires ABI 2.1 or higher.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeAccountData} params
       * @returns ResultOfDecodeAccountData
       */
      decode_account_data_sync(params) {
        return this.client.requestSync("abi.decode_account_data", params);
      }
      /**
       * Updates initial account data with initial values for the contract's static variables and owner's public key.
       *
       * @remarks
       * This operation is applicable only for initial account data (before deploy). If the contract is already deployed,
       * its data doesn't contain this data section any more.
       *
       * Doesn't support ABI version >= 2.4. Use `encode_initial_data` instead
       *
       * @param {ParamsOfUpdateInitialData} params
       * @returns ResultOfUpdateInitialData
       */
      update_initial_data(params) {
        return this.client.request("abi.update_initial_data", params);
      }
      /**
       * Updates initial account data with initial values for the contract's static variables and owner's public key.
       *
       * @remarks
       * This operation is applicable only for initial account data (before deploy). If the contract is already deployed,
       * its data doesn't contain this data section any more.
       *
       * Doesn't support ABI version >= 2.4. Use `encode_initial_data` instead
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfUpdateInitialData} params
       * @returns ResultOfUpdateInitialData
       */
      update_initial_data_sync(params) {
        return this.client.requestSync("abi.update_initial_data", params);
      }
      /**
       * Encodes initial account data with initial values for the contract's static variables and owner's public key into a data BOC that can be passed to `encode_tvc` function afterwards.
       *
       * @remarks
       * This function is analogue of `tvm.buildDataInit` function in Solidity.
       *
       * @param {ParamsOfEncodeInitialData} params
       * @returns ResultOfEncodeInitialData
       */
      encode_initial_data(params) {
        return this.client.request("abi.encode_initial_data", params);
      }
      /**
       * Encodes initial account data with initial values for the contract's static variables and owner's public key into a data BOC that can be passed to `encode_tvc` function afterwards.
       *
       * @remarks
       * This function is analogue of `tvm.buildDataInit` function in Solidity.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeInitialData} params
       * @returns ResultOfEncodeInitialData
       */
      encode_initial_data_sync(params) {
        return this.client.requestSync("abi.encode_initial_data", params);
      }
      /**
       * Decodes initial values of a contract's static variables and owner's public key from account initial data This operation is applicable only for initial account data (before deploy).
       *
       * @remarks
       * If the contract is already deployed, its data doesn't contain this data section any more.
       *
       * Doesn't support ABI version >= 2.4. Use `decode_account_data` instead
       *
       * @param {ParamsOfDecodeInitialData} params
       * @returns ResultOfDecodeInitialData
       */
      decode_initial_data(params) {
        return this.client.request("abi.decode_initial_data", params);
      }
      /**
       * Decodes initial values of a contract's static variables and owner's public key from account initial data This operation is applicable only for initial account data (before deploy).
       *
       * @remarks
       * If the contract is already deployed, its data doesn't contain this data section any more.
       *
       * Doesn't support ABI version >= 2.4. Use `decode_account_data` instead
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeInitialData} params
       * @returns ResultOfDecodeInitialData
       */
      decode_initial_data_sync(params) {
        return this.client.requestSync("abi.decode_initial_data", params);
      }
      /**
       * Decodes BOC into JSON as a set of provided parameters.
       *
       * @remarks
       * Solidity functions use ABI types for [builder encoding](https://github.com/tonlabs/TON-Solidity-Compiler/blob/master/API.md#tvmbuilderstore).
       * The simplest way to decode such a BOC is to use ABI decoding.
       * ABI has it own rules for fields layout in cells so manually encoded
       * BOC can not be described in terms of ABI rules.
       *
       * To solve this problem we introduce a new ABI type `Ref(<ParamType>)`
       * which allows to store `ParamType` ABI parameter in cell reference and, thus,
       * decode manually encoded BOCs. This type is available only in `decode_boc`
       * function and will not be available in ABI messages encoding until it is
       * included into some ABI revision.
       *
       * Such BOC descriptions covers most users needs. If someone wants to decode
       * some BOC which can not be described by these rules (i.e. BOC with TLB
       * containing constructors of flags defining some parsing conditions) then they
       * can decode the fields up to fork condition, check the parsed data manually,
       * expand the parsing schema and then decode the whole BOC with the full
       * schema.
       *
       * @param {ParamsOfDecodeBoc} params
       * @returns ResultOfDecodeBoc
       */
      decode_boc(params) {
        return this.client.request("abi.decode_boc", params);
      }
      /**
       * Decodes BOC into JSON as a set of provided parameters.
       *
       * @remarks
       * Solidity functions use ABI types for [builder encoding](https://github.com/tonlabs/TON-Solidity-Compiler/blob/master/API.md#tvmbuilderstore).
       * The simplest way to decode such a BOC is to use ABI decoding.
       * ABI has it own rules for fields layout in cells so manually encoded
       * BOC can not be described in terms of ABI rules.
       *
       * To solve this problem we introduce a new ABI type `Ref(<ParamType>)`
       * which allows to store `ParamType` ABI parameter in cell reference and, thus,
       * decode manually encoded BOCs. This type is available only in `decode_boc`
       * function and will not be available in ABI messages encoding until it is
       * included into some ABI revision.
       *
       * Such BOC descriptions covers most users needs. If someone wants to decode
       * some BOC which can not be described by these rules (i.e. BOC with TLB
       * containing constructors of flags defining some parsing conditions) then they
       * can decode the fields up to fork condition, check the parsed data manually,
       * expand the parsing schema and then decode the whole BOC with the full
       * schema.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeBoc} params
       * @returns ResultOfDecodeBoc
       */
      decode_boc_sync(params) {
        return this.client.requestSync("abi.decode_boc", params);
      }
      /**
       * Encodes given parameters in JSON into a BOC using param types from ABI.
       *
       * @param {ParamsOfAbiEncodeBoc} params
       * @returns ResultOfAbiEncodeBoc
       */
      encode_boc(params) {
        return this.client.request("abi.encode_boc", params);
      }
      /**
       * Encodes given parameters in JSON into a BOC using param types from ABI.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfAbiEncodeBoc} params
       * @returns ResultOfAbiEncodeBoc
       */
      encode_boc_sync(params) {
        return this.client.requestSync("abi.encode_boc", params);
      }
      /**
       * Calculates contract function ID by contract ABI
       *
       * @param {ParamsOfCalcFunctionId} params
       * @returns ResultOfCalcFunctionId
       */
      calc_function_id(params) {
        return this.client.request("abi.calc_function_id", params);
      }
      /**
       * Calculates contract function ID by contract ABI
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCalcFunctionId} params
       * @returns ResultOfCalcFunctionId
       */
      calc_function_id_sync(params) {
        return this.client.requestSync("abi.calc_function_id", params);
      }
      /**
       * Extracts signature from message body and calculates hash to verify the signature
       *
       * @param {ParamsOfGetSignatureData} params
       * @returns ResultOfGetSignatureData
       */
      get_signature_data(params) {
        return this.client.request("abi.get_signature_data", params);
      }
      /**
       * Extracts signature from message body and calculates hash to verify the signature
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetSignatureData} params
       * @returns ResultOfGetSignatureData
       */
      get_signature_data_sync(params) {
        return this.client.requestSync("abi.get_signature_data", params);
      }
    };
    exports.AbiModule = AbiModule;
    function bocCacheTypePinned(pin) {
      return {
        type: "Pinned",
        pin
      };
    }
    exports.bocCacheTypePinned = bocCacheTypePinned;
    function bocCacheTypeUnpinned() {
      return {
        type: "Unpinned"
      };
    }
    exports.bocCacheTypeUnpinned = bocCacheTypeUnpinned;
    function builderOpInteger(size, value) {
      return {
        type: "Integer",
        size,
        value
      };
    }
    exports.builderOpInteger = builderOpInteger;
    function builderOpBitString(value) {
      return {
        type: "BitString",
        value
      };
    }
    exports.builderOpBitString = builderOpBitString;
    function builderOpCell(builder) {
      return {
        type: "Cell",
        builder
      };
    }
    exports.builderOpCell = builderOpCell;
    function builderOpCellBoc(boc) {
      return {
        type: "CellBoc",
        boc
      };
    }
    exports.builderOpCellBoc = builderOpCellBoc;
    function builderOpAddress(address) {
      return {
        type: "Address",
        address
      };
    }
    exports.builderOpAddress = builderOpAddress;
    function tvcV1(value) {
      return {
        type: "V1",
        value
      };
    }
    exports.tvcV1 = tvcV1;
    var BocErrorCode;
    (function(BocErrorCode2) {
      BocErrorCode2[BocErrorCode2["InvalidBoc"] = 201] = "InvalidBoc";
      BocErrorCode2[BocErrorCode2["SerializationError"] = 202] = "SerializationError";
      BocErrorCode2[BocErrorCode2["InappropriateBlock"] = 203] = "InappropriateBlock";
      BocErrorCode2[BocErrorCode2["MissingSourceBoc"] = 204] = "MissingSourceBoc";
      BocErrorCode2[BocErrorCode2["InsufficientCacheSize"] = 205] = "InsufficientCacheSize";
      BocErrorCode2[BocErrorCode2["BocRefNotFound"] = 206] = "BocRefNotFound";
      BocErrorCode2[BocErrorCode2["InvalidBocRef"] = 207] = "InvalidBocRef";
    })(BocErrorCode = exports.BocErrorCode || (exports.BocErrorCode = {}));
    var BocModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Decodes tvc according to the tvc spec. Read more about tvc structure here https://github.com/tonlabs/ever-struct/blob/main/src/scheme/mod.rs#L30
       *
       * @param {ParamsOfDecodeTvc} params
       * @returns ResultOfDecodeTvc
       */
      decode_tvc(params) {
        return this.client.request("boc.decode_tvc", params);
      }
      /**
       * Decodes tvc according to the tvc spec. Read more about tvc structure here https://github.com/tonlabs/ever-struct/blob/main/src/scheme/mod.rs#L30
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeTvc} params
       * @returns ResultOfDecodeTvc
       */
      decode_tvc_sync(params) {
        return this.client.requestSync("boc.decode_tvc", params);
      }
      /**
       * Parses message boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API message object
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_message(params) {
        return this.client.request("boc.parse_message", params);
      }
      /**
       * Parses message boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API message object
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_message_sync(params) {
        return this.client.requestSync("boc.parse_message", params);
      }
      /**
       * Parses transaction boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API transaction object
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_transaction(params) {
        return this.client.request("boc.parse_transaction", params);
      }
      /**
       * Parses transaction boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API transaction object
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_transaction_sync(params) {
        return this.client.requestSync("boc.parse_transaction", params);
      }
      /**
       * Parses account boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API account object
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_account(params) {
        return this.client.request("boc.parse_account", params);
      }
      /**
       * Parses account boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API account object
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_account_sync(params) {
        return this.client.requestSync("boc.parse_account", params);
      }
      /**
       * Parses block boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API block object
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_block(params) {
        return this.client.request("boc.parse_block", params);
      }
      /**
       * Parses block boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API block object
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfParse} params
       * @returns ResultOfParse
       */
      parse_block_sync(params) {
        return this.client.requestSync("boc.parse_block", params);
      }
      /**
       * Parses shardstate boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API shardstate object
       *
       * @param {ParamsOfParseShardstate} params
       * @returns ResultOfParse
       */
      parse_shardstate(params) {
        return this.client.request("boc.parse_shardstate", params);
      }
      /**
       * Parses shardstate boc into a JSON
       *
       * @remarks
       * JSON structure is compatible with GraphQL API shardstate object
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfParseShardstate} params
       * @returns ResultOfParse
       */
      parse_shardstate_sync(params) {
        return this.client.requestSync("boc.parse_shardstate", params);
      }
      /**
       * Extract blockchain configuration from key block and also from zerostate.
       *
       * @param {ParamsOfGetBlockchainConfig} params
       * @returns ResultOfGetBlockchainConfig
       */
      get_blockchain_config(params) {
        return this.client.request("boc.get_blockchain_config", params);
      }
      /**
       * Extract blockchain configuration from key block and also from zerostate.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetBlockchainConfig} params
       * @returns ResultOfGetBlockchainConfig
       */
      get_blockchain_config_sync(params) {
        return this.client.requestSync("boc.get_blockchain_config", params);
      }
      /**
       * Calculates BOC root hash
       *
       * @param {ParamsOfGetBocHash} params
       * @returns ResultOfGetBocHash
       */
      get_boc_hash(params) {
        return this.client.request("boc.get_boc_hash", params);
      }
      /**
       * Calculates BOC root hash
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetBocHash} params
       * @returns ResultOfGetBocHash
       */
      get_boc_hash_sync(params) {
        return this.client.requestSync("boc.get_boc_hash", params);
      }
      /**
       * Calculates BOC depth
       *
       * @param {ParamsOfGetBocDepth} params
       * @returns ResultOfGetBocDepth
       */
      get_boc_depth(params) {
        return this.client.request("boc.get_boc_depth", params);
      }
      /**
       * Calculates BOC depth
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetBocDepth} params
       * @returns ResultOfGetBocDepth
       */
      get_boc_depth_sync(params) {
        return this.client.requestSync("boc.get_boc_depth", params);
      }
      /**
       * Extracts code from TVC contract image
       *
       * @param {ParamsOfGetCodeFromTvc} params
       * @returns ResultOfGetCodeFromTvc
       */
      get_code_from_tvc(params) {
        return this.client.request("boc.get_code_from_tvc", params);
      }
      /**
       * Extracts code from TVC contract image
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetCodeFromTvc} params
       * @returns ResultOfGetCodeFromTvc
       */
      get_code_from_tvc_sync(params) {
        return this.client.requestSync("boc.get_code_from_tvc", params);
      }
      /**
       * Get BOC from cache
       *
       * @param {ParamsOfBocCacheGet} params
       * @returns ResultOfBocCacheGet
       */
      cache_get(params) {
        return this.client.request("boc.cache_get", params);
      }
      /**
       * Get BOC from cache
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfBocCacheGet} params
       * @returns ResultOfBocCacheGet
       */
      cache_get_sync(params) {
        return this.client.requestSync("boc.cache_get", params);
      }
      /**
       * Save BOC into cache or increase pin counter for existing pinned BOC
       *
       * @param {ParamsOfBocCacheSet} params
       * @returns ResultOfBocCacheSet
       */
      cache_set(params) {
        return this.client.request("boc.cache_set", params);
      }
      /**
       * Save BOC into cache or increase pin counter for existing pinned BOC
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfBocCacheSet} params
       * @returns ResultOfBocCacheSet
       */
      cache_set_sync(params) {
        return this.client.requestSync("boc.cache_set", params);
      }
      /**
       * Unpin BOCs with specified pin defined in the `cache_set`. Decrease pin reference counter for BOCs with specified pin defined in the `cache_set`.
       *
       * @remarks
       * BOCs which have only 1 pin and its reference counter become 0 will be removed from cache
       *
       * @param {ParamsOfBocCacheUnpin} params
       * @returns
       */
      cache_unpin(params) {
        return this.client.request("boc.cache_unpin", params);
      }
      /**
       * Unpin BOCs with specified pin defined in the `cache_set`. Decrease pin reference counter for BOCs with specified pin defined in the `cache_set`.
       *
       * @remarks
       * BOCs which have only 1 pin and its reference counter become 0 will be removed from cache
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfBocCacheUnpin} params
       * @returns
       */
      cache_unpin_sync(params) {
        this.client.requestSync("boc.cache_unpin", params);
      }
      /**
       * Encodes bag of cells (BOC) with builder operations. This method provides the same functionality as Solidity TvmBuilder. Resulting BOC of this method can be passed into Solidity and C++ contracts as TvmCell type.
       *
       * @param {ParamsOfEncodeBoc} params
       * @returns ResultOfEncodeBoc
       */
      encode_boc(params) {
        return this.client.request("boc.encode_boc", params);
      }
      /**
       * Encodes bag of cells (BOC) with builder operations. This method provides the same functionality as Solidity TvmBuilder. Resulting BOC of this method can be passed into Solidity and C++ contracts as TvmCell type.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeBoc} params
       * @returns ResultOfEncodeBoc
       */
      encode_boc_sync(params) {
        return this.client.requestSync("boc.encode_boc", params);
      }
      /**
       * Returns the contract code's salt if it is present.
       *
       * @param {ParamsOfGetCodeSalt} params
       * @returns ResultOfGetCodeSalt
       */
      get_code_salt(params) {
        return this.client.request("boc.get_code_salt", params);
      }
      /**
       * Returns the contract code's salt if it is present.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetCodeSalt} params
       * @returns ResultOfGetCodeSalt
       */
      get_code_salt_sync(params) {
        return this.client.requestSync("boc.get_code_salt", params);
      }
      /**
       * Sets new salt to contract code.
       *
       * @remarks
       * Returns the new contract code with salt.
       *
       * @param {ParamsOfSetCodeSalt} params
       * @returns ResultOfSetCodeSalt
       */
      set_code_salt(params) {
        return this.client.request("boc.set_code_salt", params);
      }
      /**
       * Sets new salt to contract code.
       *
       * @remarks
       * Returns the new contract code with salt.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSetCodeSalt} params
       * @returns ResultOfSetCodeSalt
       */
      set_code_salt_sync(params) {
        return this.client.requestSync("boc.set_code_salt", params);
      }
      /**
       * Decodes contract's initial state into code, data, libraries and special options.
       *
       * @param {ParamsOfDecodeStateInit} params
       * @returns ResultOfDecodeStateInit
       */
      decode_state_init(params) {
        return this.client.request("boc.decode_state_init", params);
      }
      /**
       * Decodes contract's initial state into code, data, libraries and special options.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecodeStateInit} params
       * @returns ResultOfDecodeStateInit
       */
      decode_state_init_sync(params) {
        return this.client.requestSync("boc.decode_state_init", params);
      }
      /**
       * Encodes initial contract state from code, data, libraries ans special options (see input params)
       *
       * @param {ParamsOfEncodeStateInit} params
       * @returns ResultOfEncodeStateInit
       */
      encode_state_init(params) {
        return this.client.request("boc.encode_state_init", params);
      }
      /**
       * Encodes initial contract state from code, data, libraries ans special options (see input params)
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeStateInit} params
       * @returns ResultOfEncodeStateInit
       */
      encode_state_init_sync(params) {
        return this.client.requestSync("boc.encode_state_init", params);
      }
      /**
       * Encodes a message
       *
       * @remarks
       * Allows to encode any external inbound message.
       *
       * @param {ParamsOfEncodeExternalInMessage} params
       * @returns ResultOfEncodeExternalInMessage
       */
      encode_external_in_message(params) {
        return this.client.request("boc.encode_external_in_message", params);
      }
      /**
       * Encodes a message
       *
       * @remarks
       * Allows to encode any external inbound message.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfEncodeExternalInMessage} params
       * @returns ResultOfEncodeExternalInMessage
       */
      encode_external_in_message_sync(params) {
        return this.client.requestSync("boc.encode_external_in_message", params);
      }
      /**
       * Returns the compiler version used to compile the code.
       *
       * @param {ParamsOfGetCompilerVersion} params
       * @returns ResultOfGetCompilerVersion
       */
      get_compiler_version(params) {
        return this.client.request("boc.get_compiler_version", params);
      }
      /**
       * Returns the compiler version used to compile the code.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetCompilerVersion} params
       * @returns ResultOfGetCompilerVersion
       */
      get_compiler_version_sync(params) {
        return this.client.requestSync("boc.get_compiler_version", params);
      }
    };
    exports.BocModule = BocModule;
    var ProcessingErrorCode;
    (function(ProcessingErrorCode2) {
      ProcessingErrorCode2[ProcessingErrorCode2["MessageAlreadyExpired"] = 501] = "MessageAlreadyExpired";
      ProcessingErrorCode2[ProcessingErrorCode2["MessageHasNotDestinationAddress"] = 502] = "MessageHasNotDestinationAddress";
      ProcessingErrorCode2[ProcessingErrorCode2["CanNotBuildMessageCell"] = 503] = "CanNotBuildMessageCell";
      ProcessingErrorCode2[ProcessingErrorCode2["FetchBlockFailed"] = 504] = "FetchBlockFailed";
      ProcessingErrorCode2[ProcessingErrorCode2["SendMessageFailed"] = 505] = "SendMessageFailed";
      ProcessingErrorCode2[ProcessingErrorCode2["InvalidMessageBoc"] = 506] = "InvalidMessageBoc";
      ProcessingErrorCode2[ProcessingErrorCode2["MessageExpired"] = 507] = "MessageExpired";
      ProcessingErrorCode2[ProcessingErrorCode2["TransactionWaitTimeout"] = 508] = "TransactionWaitTimeout";
      ProcessingErrorCode2[ProcessingErrorCode2["InvalidBlockReceived"] = 509] = "InvalidBlockReceived";
      ProcessingErrorCode2[ProcessingErrorCode2["CanNotCheckBlockShard"] = 510] = "CanNotCheckBlockShard";
      ProcessingErrorCode2[ProcessingErrorCode2["BlockNotFound"] = 511] = "BlockNotFound";
      ProcessingErrorCode2[ProcessingErrorCode2["InvalidData"] = 512] = "InvalidData";
      ProcessingErrorCode2[ProcessingErrorCode2["ExternalSignerMustNotBeUsed"] = 513] = "ExternalSignerMustNotBeUsed";
      ProcessingErrorCode2[ProcessingErrorCode2["MessageRejected"] = 514] = "MessageRejected";
      ProcessingErrorCode2[ProcessingErrorCode2["InvalidRempStatus"] = 515] = "InvalidRempStatus";
      ProcessingErrorCode2[ProcessingErrorCode2["NextRempStatusTimeout"] = 516] = "NextRempStatusTimeout";
      ProcessingErrorCode2[ProcessingErrorCode2["InvalidThread"] = 517] = "InvalidThread";
    })(ProcessingErrorCode = exports.ProcessingErrorCode || (exports.ProcessingErrorCode = {}));
    function processingEventWillFetchFirstBlock(message_id, message_dst) {
      return {
        type: "WillFetchFirstBlock",
        message_id,
        message_dst
      };
    }
    exports.processingEventWillFetchFirstBlock = processingEventWillFetchFirstBlock;
    function processingEventFetchFirstBlockFailed(error, message_id, message_dst) {
      return {
        type: "FetchFirstBlockFailed",
        error,
        message_id,
        message_dst
      };
    }
    exports.processingEventFetchFirstBlockFailed = processingEventFetchFirstBlockFailed;
    function processingEventWillSend(shard_block_id, message_id, message_dst, message) {
      return {
        type: "WillSend",
        shard_block_id,
        message_id,
        message_dst,
        message
      };
    }
    exports.processingEventWillSend = processingEventWillSend;
    function processingEventDidSend(shard_block_id, message_id, message_dst, message) {
      return {
        type: "DidSend",
        shard_block_id,
        message_id,
        message_dst,
        message
      };
    }
    exports.processingEventDidSend = processingEventDidSend;
    function processingEventSendFailed(shard_block_id, message_id, message_dst, message, error) {
      return {
        type: "SendFailed",
        shard_block_id,
        message_id,
        message_dst,
        message,
        error
      };
    }
    exports.processingEventSendFailed = processingEventSendFailed;
    function processingEventWillFetchNextBlock(shard_block_id, message_id, message_dst, message) {
      return {
        type: "WillFetchNextBlock",
        shard_block_id,
        message_id,
        message_dst,
        message
      };
    }
    exports.processingEventWillFetchNextBlock = processingEventWillFetchNextBlock;
    function processingEventFetchNextBlockFailed(shard_block_id, message_id, message_dst, message, error) {
      return {
        type: "FetchNextBlockFailed",
        shard_block_id,
        message_id,
        message_dst,
        message,
        error
      };
    }
    exports.processingEventFetchNextBlockFailed = processingEventFetchNextBlockFailed;
    function processingEventMessageExpired(message_id, message_dst, message, error) {
      return {
        type: "MessageExpired",
        message_id,
        message_dst,
        message,
        error
      };
    }
    exports.processingEventMessageExpired = processingEventMessageExpired;
    function processingEventRempSentToValidators(message_id, message_dst, timestamp, json) {
      return {
        type: "RempSentToValidators",
        message_id,
        message_dst,
        timestamp,
        json
      };
    }
    exports.processingEventRempSentToValidators = processingEventRempSentToValidators;
    function processingEventRempIncludedIntoBlock(message_id, message_dst, timestamp, json) {
      return {
        type: "RempIncludedIntoBlock",
        message_id,
        message_dst,
        timestamp,
        json
      };
    }
    exports.processingEventRempIncludedIntoBlock = processingEventRempIncludedIntoBlock;
    function processingEventRempIncludedIntoAcceptedBlock(message_id, message_dst, timestamp, json) {
      return {
        type: "RempIncludedIntoAcceptedBlock",
        message_id,
        message_dst,
        timestamp,
        json
      };
    }
    exports.processingEventRempIncludedIntoAcceptedBlock = processingEventRempIncludedIntoAcceptedBlock;
    function processingEventRempOther(message_id, message_dst, timestamp, json) {
      return {
        type: "RempOther",
        message_id,
        message_dst,
        timestamp,
        json
      };
    }
    exports.processingEventRempOther = processingEventRempOther;
    function processingEventRempError(message_id, message_dst, error) {
      return {
        type: "RempError",
        message_id,
        message_dst,
        error
      };
    }
    exports.processingEventRempError = processingEventRempError;
    var MonitorFetchWaitMode;
    (function(MonitorFetchWaitMode2) {
      MonitorFetchWaitMode2["AtLeastOne"] = "AtLeastOne";
      MonitorFetchWaitMode2["All"] = "All";
      MonitorFetchWaitMode2["NoWait"] = "NoWait";
    })(MonitorFetchWaitMode = exports.MonitorFetchWaitMode || (exports.MonitorFetchWaitMode = {}));
    function monitoredMessageBoc(boc) {
      return {
        type: "Boc",
        boc
      };
    }
    exports.monitoredMessageBoc = monitoredMessageBoc;
    function monitoredMessageHashAddress(hash, address) {
      return {
        type: "HashAddress",
        hash,
        address
      };
    }
    exports.monitoredMessageHashAddress = monitoredMessageHashAddress;
    var MessageMonitoringStatus;
    (function(MessageMonitoringStatus2) {
      MessageMonitoringStatus2["Finalized"] = "Finalized";
      MessageMonitoringStatus2["Timeout"] = "Timeout";
      MessageMonitoringStatus2["Reserved"] = "Reserved";
    })(MessageMonitoringStatus = exports.MessageMonitoringStatus || (exports.MessageMonitoringStatus = {}));
    var ProcessingModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Starts monitoring for the processing results of the specified messages.
       *
       * @remarks
       * Message monitor performs background monitoring for a message processing
       * results for the specified set of messages.
       *
       * Message monitor can serve several isolated monitoring queues.
       * Each monitor queue has a unique application defined identifier (or name)
       * used to separate several queue's.
       *
       * There are two important lists inside of the monitoring queue:
       *
       * - unresolved messages: contains messages requested by the application for
       *   monitoring and not yet resolved;
       *
       * - resolved results: contains resolved processing results for monitored
       *   messages.
       *
       * Each monitoring queue tracks own unresolved and resolved lists.
       * Application can add more messages to the monitoring queue at any time.
       *
       * Message monitor accumulates resolved results.
       * Application should fetch this results with `fetchNextMonitorResults`
       * function.
       *
       * When both unresolved and resolved lists becomes empty, monitor stops any
       * background activity and frees all allocated internal memory.
       *
       * If monitoring queue with specified name already exists then messages will be
       * added to the unresolved list.
       *
       * If monitoring queue with specified name does not exist then monitoring queue
       * will be created with specified unresolved messages.
       *
       * @param {ParamsOfMonitorMessages} params
       * @returns
       */
      monitor_messages(params) {
        return this.client.request("processing.monitor_messages", params);
      }
      /**
       * Starts monitoring for the processing results of the specified messages.
       *
       * @remarks
       * Message monitor performs background monitoring for a message processing
       * results for the specified set of messages.
       *
       * Message monitor can serve several isolated monitoring queues.
       * Each monitor queue has a unique application defined identifier (or name)
       * used to separate several queue's.
       *
       * There are two important lists inside of the monitoring queue:
       *
       * - unresolved messages: contains messages requested by the application for
       *   monitoring and not yet resolved;
       *
       * - resolved results: contains resolved processing results for monitored
       *   messages.
       *
       * Each monitoring queue tracks own unresolved and resolved lists.
       * Application can add more messages to the monitoring queue at any time.
       *
       * Message monitor accumulates resolved results.
       * Application should fetch this results with `fetchNextMonitorResults`
       * function.
       *
       * When both unresolved and resolved lists becomes empty, monitor stops any
       * background activity and frees all allocated internal memory.
       *
       * If monitoring queue with specified name already exists then messages will be
       * added to the unresolved list.
       *
       * If monitoring queue with specified name does not exist then monitoring queue
       * will be created with specified unresolved messages.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfMonitorMessages} params
       * @returns
       */
      monitor_messages_sync(params) {
        this.client.requestSync("processing.monitor_messages", params);
      }
      /**
       * Returns summary information about current state of the specified monitoring queue.
       *
       * @param {ParamsOfGetMonitorInfo} params
       * @returns MonitoringQueueInfo
       */
      get_monitor_info(params) {
        return this.client.request("processing.get_monitor_info", params);
      }
      /**
       * Returns summary information about current state of the specified monitoring queue.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetMonitorInfo} params
       * @returns MonitoringQueueInfo
       */
      get_monitor_info_sync(params) {
        return this.client.requestSync("processing.get_monitor_info", params);
      }
      /**
       * Fetches next resolved results from the specified monitoring queue.
       *
       * @remarks
       * Results and waiting options are depends on the `wait` parameter.
       * All returned results will be removed from the queue's resolved list.
       *
       * @param {ParamsOfFetchNextMonitorResults} params
       * @returns ResultOfFetchNextMonitorResults
       */
      fetch_next_monitor_results(params) {
        return this.client.request("processing.fetch_next_monitor_results", params);
      }
      /**
       * Fetches next resolved results from the specified monitoring queue.
       *
       * @remarks
       * Results and waiting options are depends on the `wait` parameter.
       * All returned results will be removed from the queue's resolved list.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfFetchNextMonitorResults} params
       * @returns ResultOfFetchNextMonitorResults
       */
      fetch_next_monitor_results_sync(params) {
        return this.client.requestSync("processing.fetch_next_monitor_results", params);
      }
      /**
       * Cancels all background activity and releases all allocated system resources for the specified monitoring queue.
       *
       * @param {ParamsOfCancelMonitor} params
       * @returns
       */
      cancel_monitor(params) {
        return this.client.request("processing.cancel_monitor", params);
      }
      /**
       * Cancels all background activity and releases all allocated system resources for the specified monitoring queue.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCancelMonitor} params
       * @returns
       */
      cancel_monitor_sync(params) {
        this.client.requestSync("processing.cancel_monitor", params);
      }
      /**
       * Sends specified messages to the blockchain.
       *
       * @param {ParamsOfSendMessages} params
       * @returns ResultOfSendMessages
       */
      send_messages(params) {
        return this.client.request("processing.send_messages", params);
      }
      /**
       * Sends specified messages to the blockchain.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSendMessages} params
       * @returns ResultOfSendMessages
       */
      send_messages_sync(params) {
        return this.client.requestSync("processing.send_messages", params);
      }
      /**
       * Sends message to the network
       *
       * @remarks
       * Sends message to the network and returns the last generated shard block of
       * the destination account before the message was sent. It will be required
       * later for message processing.
       *
       * @param {ParamsOfSendMessage} params
       * @returns ResultOfSendMessage
       */
      send_message(params, responseHandler) {
        return this.client.request("processing.send_message", params, responseHandler);
      }
      /**
       * Sends message to the network
       *
       * @remarks
       * Sends message to the network and returns the last generated shard block of
       * the destination account before the message was sent. It will be required
       * later for message processing.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSendMessage} params
       * @returns ResultOfSendMessage
       */
      send_message_sync(params) {
        return this.client.requestSync("processing.send_message", params);
      }
      /**
       * Performs monitoring of the network for the result transaction of the external inbound message processing.
       *
       * @remarks
       * `send_events` enables intermediate events, such as `WillFetchNextBlock`,
       * `FetchNextBlockFailed` that may be useful for logging of new shard blocks
       * creation during message processing.
       *
       * Note, that presence of the `abi` parameter is critical for ABI
       * compliant contracts. Message processing uses drastically
       * different strategy for processing message for contracts which
       * ABI includes "expire" header.
       *
       * When the ABI header `expire` is present, the processing uses
       * `message expiration` strategy:
       * - The maximum block gen time is set to `message_expiration_timeout +
       *   transaction_wait_timeout`.
       * - When maximum block gen time is reached, the processing will be finished
       *   with `MessageExpired` error.
       *
       * When the ABI header `expire` isn't present or `abi` parameter
       * isn't specified, the processing uses `transaction waiting`
       * strategy:
       * - The maximum block gen time is set to `now() + transaction_wait_timeout`.
       *
       * - If maximum block gen time is reached and no result transaction is found,
       * the processing will exit with an error.
       *
       * @param {ParamsOfWaitForTransaction} params
       * @returns ResultOfProcessMessage
       */
      wait_for_transaction(params, responseHandler) {
        return this.client.request("processing.wait_for_transaction", params, responseHandler);
      }
      /**
       * Performs monitoring of the network for the result transaction of the external inbound message processing.
       *
       * @remarks
       * `send_events` enables intermediate events, such as `WillFetchNextBlock`,
       * `FetchNextBlockFailed` that may be useful for logging of new shard blocks
       * creation during message processing.
       *
       * Note, that presence of the `abi` parameter is critical for ABI
       * compliant contracts. Message processing uses drastically
       * different strategy for processing message for contracts which
       * ABI includes "expire" header.
       *
       * When the ABI header `expire` is present, the processing uses
       * `message expiration` strategy:
       * - The maximum block gen time is set to `message_expiration_timeout +
       *   transaction_wait_timeout`.
       * - When maximum block gen time is reached, the processing will be finished
       *   with `MessageExpired` error.
       *
       * When the ABI header `expire` isn't present or `abi` parameter
       * isn't specified, the processing uses `transaction waiting`
       * strategy:
       * - The maximum block gen time is set to `now() + transaction_wait_timeout`.
       *
       * - If maximum block gen time is reached and no result transaction is found,
       * the processing will exit with an error.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfWaitForTransaction} params
       * @returns ResultOfProcessMessage
       */
      wait_for_transaction_sync(params) {
        return this.client.requestSync("processing.wait_for_transaction", params);
      }
      /**
       * Creates message, sends it to the network and monitors its processing.
       *
       * @remarks
       * Creates ABI-compatible message,
       * sends it to the network and monitors for the result transaction.
       * Decodes the output messages' bodies.
       *
       * If contract's ABI includes "expire" header, then
       * SDK implements retries in case of unsuccessful message delivery within the
       * expiration timeout: SDK recreates the message, sends it and processes it
       * again.
       *
       * The intermediate events, such as `WillFetchFirstBlock`, `WillSend`,
       * `DidSend`, `WillFetchNextBlock`, etc - are switched on/off by `send_events`
       * flag and logged into the supplied callback function.
       *
       * The retry configuration parameters are defined in the client's
       * `NetworkConfig` and `AbiConfig`.
       *
       * If contract's ABI does not include "expire" header
       * then, if no transaction is found within the network timeout (see config
       * parameter ), exits with error.
       *
       * @param {ParamsOfProcessMessage} params
       * @returns ResultOfProcessMessage
       */
      process_message(params, responseHandler) {
        return this.client.request("processing.process_message", params, responseHandler);
      }
      /**
       * Creates message, sends it to the network and monitors its processing.
       *
       * @remarks
       * Creates ABI-compatible message,
       * sends it to the network and monitors for the result transaction.
       * Decodes the output messages' bodies.
       *
       * If contract's ABI includes "expire" header, then
       * SDK implements retries in case of unsuccessful message delivery within the
       * expiration timeout: SDK recreates the message, sends it and processes it
       * again.
       *
       * The intermediate events, such as `WillFetchFirstBlock`, `WillSend`,
       * `DidSend`, `WillFetchNextBlock`, etc - are switched on/off by `send_events`
       * flag and logged into the supplied callback function.
       *
       * The retry configuration parameters are defined in the client's
       * `NetworkConfig` and `AbiConfig`.
       *
       * If contract's ABI does not include "expire" header
       * then, if no transaction is found within the network timeout (see config
       * parameter ), exits with error.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfProcessMessage} params
       * @returns ResultOfProcessMessage
       */
      process_message_sync(params) {
        return this.client.requestSync("processing.process_message", params);
      }
    };
    exports.ProcessingModule = ProcessingModule;
    function addressStringFormatAccountId() {
      return {
        type: "AccountId"
      };
    }
    exports.addressStringFormatAccountId = addressStringFormatAccountId;
    function addressStringFormatHex() {
      return {
        type: "Hex"
      };
    }
    exports.addressStringFormatHex = addressStringFormatHex;
    function addressStringFormatBase64(url, test, bounce) {
      return {
        type: "Base64",
        url,
        test,
        bounce
      };
    }
    exports.addressStringFormatBase64 = addressStringFormatBase64;
    var AccountAddressType;
    (function(AccountAddressType2) {
      AccountAddressType2["AccountId"] = "AccountId";
      AccountAddressType2["Hex"] = "Hex";
      AccountAddressType2["Base64"] = "Base64";
    })(AccountAddressType = exports.AccountAddressType || (exports.AccountAddressType = {}));
    var UtilsModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Converts address from any TON format to any TON format
       *
       * @param {ParamsOfConvertAddress} params
       * @returns ResultOfConvertAddress
       */
      convert_address(params) {
        return this.client.request("utils.convert_address", params);
      }
      /**
       * Converts address from any TON format to any TON format
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfConvertAddress} params
       * @returns ResultOfConvertAddress
       */
      convert_address_sync(params) {
        return this.client.requestSync("utils.convert_address", params);
      }
      /**
       * Validates and returns the type of any TON address.
       *
       * @remarks
       * Address types are the following
       *
       * `0:919db8e740d50bf349df2eea03fa30c385d846b991ff5542e67098ee833fc7f7` -
       * standard TON address most commonly used in all cases. Also called as hex
       * address `919db8e740d50bf349df2eea03fa30c385d846b991ff5542e67098ee833fc7f7` -
       * account ID. A part of full address. Identifies account inside particular
       * workchain `EQCRnbjnQNUL80nfLuoD+jDDhdhGuZH/VULmcJjugz/H9wam` - base64
       * address. Also called "user-friendly". Was used at the beginning of TON. Now
       * it is supported for compatibility
       *
       * @param {ParamsOfGetAddressType} params
       * @returns ResultOfGetAddressType
       */
      get_address_type(params) {
        return this.client.request("utils.get_address_type", params);
      }
      /**
       * Validates and returns the type of any TON address.
       *
       * @remarks
       * Address types are the following
       *
       * `0:919db8e740d50bf349df2eea03fa30c385d846b991ff5542e67098ee833fc7f7` -
       * standard TON address most commonly used in all cases. Also called as hex
       * address `919db8e740d50bf349df2eea03fa30c385d846b991ff5542e67098ee833fc7f7` -
       * account ID. A part of full address. Identifies account inside particular
       * workchain `EQCRnbjnQNUL80nfLuoD+jDDhdhGuZH/VULmcJjugz/H9wam` - base64
       * address. Also called "user-friendly". Was used at the beginning of TON. Now
       * it is supported for compatibility
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfGetAddressType} params
       * @returns ResultOfGetAddressType
       */
      get_address_type_sync(params) {
        return this.client.requestSync("utils.get_address_type", params);
      }
      /**
       * Calculates storage fee for an account over a specified time period
       *
       * @param {ParamsOfCalcStorageFee} params
       * @returns ResultOfCalcStorageFee
       */
      calc_storage_fee(params) {
        return this.client.request("utils.calc_storage_fee", params);
      }
      /**
       * Calculates storage fee for an account over a specified time period
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCalcStorageFee} params
       * @returns ResultOfCalcStorageFee
       */
      calc_storage_fee_sync(params) {
        return this.client.requestSync("utils.calc_storage_fee", params);
      }
      /**
       * Compresses data using Zstandard algorithm
       *
       * @param {ParamsOfCompressZstd} params
       * @returns ResultOfCompressZstd
       */
      compress_zstd(params) {
        return this.client.request("utils.compress_zstd", params);
      }
      /**
       * Compresses data using Zstandard algorithm
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCompressZstd} params
       * @returns ResultOfCompressZstd
       */
      compress_zstd_sync(params) {
        return this.client.requestSync("utils.compress_zstd", params);
      }
      /**
       * Decompresses data using Zstandard algorithm
       *
       * @param {ParamsOfDecompressZstd} params
       * @returns ResultOfDecompressZstd
       */
      decompress_zstd(params) {
        return this.client.request("utils.decompress_zstd", params);
      }
      /**
       * Decompresses data using Zstandard algorithm
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfDecompressZstd} params
       * @returns ResultOfDecompressZstd
       */
      decompress_zstd_sync(params) {
        return this.client.requestSync("utils.decompress_zstd", params);
      }
    };
    exports.UtilsModule = UtilsModule;
    var TvmErrorCode;
    (function(TvmErrorCode2) {
      TvmErrorCode2[TvmErrorCode2["CanNotReadTransaction"] = 401] = "CanNotReadTransaction";
      TvmErrorCode2[TvmErrorCode2["CanNotReadBlockchainConfig"] = 402] = "CanNotReadBlockchainConfig";
      TvmErrorCode2[TvmErrorCode2["TransactionAborted"] = 403] = "TransactionAborted";
      TvmErrorCode2[TvmErrorCode2["InternalError"] = 404] = "InternalError";
      TvmErrorCode2[TvmErrorCode2["ActionPhaseFailed"] = 405] = "ActionPhaseFailed";
      TvmErrorCode2[TvmErrorCode2["AccountCodeMissing"] = 406] = "AccountCodeMissing";
      TvmErrorCode2[TvmErrorCode2["LowBalance"] = 407] = "LowBalance";
      TvmErrorCode2[TvmErrorCode2["AccountFrozenOrDeleted"] = 408] = "AccountFrozenOrDeleted";
      TvmErrorCode2[TvmErrorCode2["AccountMissing"] = 409] = "AccountMissing";
      TvmErrorCode2[TvmErrorCode2["UnknownExecutionError"] = 410] = "UnknownExecutionError";
      TvmErrorCode2[TvmErrorCode2["InvalidInputStack"] = 411] = "InvalidInputStack";
      TvmErrorCode2[TvmErrorCode2["InvalidAccountBoc"] = 412] = "InvalidAccountBoc";
      TvmErrorCode2[TvmErrorCode2["InvalidMessageType"] = 413] = "InvalidMessageType";
      TvmErrorCode2[TvmErrorCode2["ContractExecutionError"] = 414] = "ContractExecutionError";
      TvmErrorCode2[TvmErrorCode2["AccountIsSuspended"] = 415] = "AccountIsSuspended";
    })(TvmErrorCode = exports.TvmErrorCode || (exports.TvmErrorCode = {}));
    function accountForExecutorNone() {
      return {
        type: "None"
      };
    }
    exports.accountForExecutorNone = accountForExecutorNone;
    function accountForExecutorUninit() {
      return {
        type: "Uninit"
      };
    }
    exports.accountForExecutorUninit = accountForExecutorUninit;
    function accountForExecutorAccount(boc, unlimited_balance) {
      return {
        type: "Account",
        boc,
        unlimited_balance
      };
    }
    exports.accountForExecutorAccount = accountForExecutorAccount;
    var TvmModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Emulates all the phases of contract execution locally
       *
       * @remarks
       * Performs all the phases of contract execution on Transaction Executor -
       * the same component that is used on Validator Nodes.
       *
       * Can be used for contract debugging, to find out the reason why a message was
       * not delivered successfully. Validators throw away the failed external
       * inbound messages (if they failed before `ACCEPT`) in the real network.
       * This is why these messages are impossible to debug in the real network.
       * With the help of run_executor you can do that. In fact, `process_message`
       * function performs local check with `run_executor` if there was no
       * transaction as a result of processing and returns the error, if there is
       * one.
       *
       * Another use case to use `run_executor` is to estimate fees for message
       * execution. Set  `AccountForExecutor::Account.unlimited_balance`
       * to `true` so that emulation will not depend on the actual balance.
       * This may be needed to calculate deploy fees for an account that does not
       * exist yet. JSON with fees is in `fees` field of the result.
       *
       * One more use case - you can produce the sequence of operations,
       * thus emulating the sequential contract calls locally.
       * And so on.
       *
       * Transaction executor requires account BOC (bag of cells) as a parameter.
       * To get the account BOC - use `net.query` method to download it from GraphQL
       * API (field `boc` of `account`) or generate it with `abi.encode_account`
       * method.
       *
       * Also it requires message BOC. To get the message BOC - use
       * `abi.encode_message` or `abi.encode_internal_message`.
       *
       * If you need this emulation to be as precise as possible (for instance -
       * emulate transaction with particular lt in particular block or use particular
       * blockchain config, downloaded from a particular key block - then specify
       * `execution_options` parameter.
       *
       * If you need to see the aborted transaction as a result, not as an error, set
       * `skip_transaction_check` to `true`.
       *
       * @param {ParamsOfRunExecutor} params
       * @returns ResultOfRunExecutor
       */
      run_executor(params) {
        return this.client.request("tvm.run_executor", params);
      }
      /**
       * Emulates all the phases of contract execution locally
       *
       * @remarks
       * Performs all the phases of contract execution on Transaction Executor -
       * the same component that is used on Validator Nodes.
       *
       * Can be used for contract debugging, to find out the reason why a message was
       * not delivered successfully. Validators throw away the failed external
       * inbound messages (if they failed before `ACCEPT`) in the real network.
       * This is why these messages are impossible to debug in the real network.
       * With the help of run_executor you can do that. In fact, `process_message`
       * function performs local check with `run_executor` if there was no
       * transaction as a result of processing and returns the error, if there is
       * one.
       *
       * Another use case to use `run_executor` is to estimate fees for message
       * execution. Set  `AccountForExecutor::Account.unlimited_balance`
       * to `true` so that emulation will not depend on the actual balance.
       * This may be needed to calculate deploy fees for an account that does not
       * exist yet. JSON with fees is in `fees` field of the result.
       *
       * One more use case - you can produce the sequence of operations,
       * thus emulating the sequential contract calls locally.
       * And so on.
       *
       * Transaction executor requires account BOC (bag of cells) as a parameter.
       * To get the account BOC - use `net.query` method to download it from GraphQL
       * API (field `boc` of `account`) or generate it with `abi.encode_account`
       * method.
       *
       * Also it requires message BOC. To get the message BOC - use
       * `abi.encode_message` or `abi.encode_internal_message`.
       *
       * If you need this emulation to be as precise as possible (for instance -
       * emulate transaction with particular lt in particular block or use particular
       * blockchain config, downloaded from a particular key block - then specify
       * `execution_options` parameter.
       *
       * If you need to see the aborted transaction as a result, not as an error, set
       * `skip_transaction_check` to `true`.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfRunExecutor} params
       * @returns ResultOfRunExecutor
       */
      run_executor_sync(params) {
        return this.client.requestSync("tvm.run_executor", params);
      }
      /**
       * Executes get-methods of ABI-compatible contracts
       *
       * @remarks
       * Performs only a part of compute phase of transaction execution
       * that is used to run get-methods of ABI-compatible contracts.
       *
       * If you try to run get-methods with `run_executor` you will get an error,
       * because it checks ACCEPT and exits if there is none, which is actually true
       * for get-methods.
       *
       *  To get the account BOC (bag of cells) - use `net.query` method to download
       * it from GraphQL API (field `boc` of `account`) or generate it with
       * `abi.encode_account method`. To get the message BOC - use
       * `abi.encode_message` or prepare it any other way, for instance, with FIFT
       * script.
       *
       * Attention! Updated account state is produces as well, but only
       * `account_state.storage.state.data`  part of the BOC is updated.
       *
       * @param {ParamsOfRunTvm} params
       * @returns ResultOfRunTvm
       */
      run_tvm(params) {
        return this.client.request("tvm.run_tvm", params);
      }
      /**
       * Executes get-methods of ABI-compatible contracts
       *
       * @remarks
       * Performs only a part of compute phase of transaction execution
       * that is used to run get-methods of ABI-compatible contracts.
       *
       * If you try to run get-methods with `run_executor` you will get an error,
       * because it checks ACCEPT and exits if there is none, which is actually true
       * for get-methods.
       *
       *  To get the account BOC (bag of cells) - use `net.query` method to download
       * it from GraphQL API (field `boc` of `account`) or generate it with
       * `abi.encode_account method`. To get the message BOC - use
       * `abi.encode_message` or prepare it any other way, for instance, with FIFT
       * script.
       *
       * Attention! Updated account state is produces as well, but only
       * `account_state.storage.state.data`  part of the BOC is updated.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfRunTvm} params
       * @returns ResultOfRunTvm
       */
      run_tvm_sync(params) {
        return this.client.requestSync("tvm.run_tvm", params);
      }
      /**
       * Executes a get-method of FIFT contract
       *
       * @remarks
       * Executes a get-method of FIFT contract that fulfills the smc-guidelines https://test.ton.org/smc-guidelines.txt
       * and returns the result data from TVM's stack
       *
       * @param {ParamsOfRunGet} params
       * @returns ResultOfRunGet
       */
      run_get(params) {
        return this.client.request("tvm.run_get", params);
      }
      /**
       * Executes a get-method of FIFT contract
       *
       * @remarks
       * Executes a get-method of FIFT contract that fulfills the smc-guidelines https://test.ton.org/smc-guidelines.txt
       * and returns the result data from TVM's stack
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfRunGet} params
       * @returns ResultOfRunGet
       */
      run_get_sync(params) {
        return this.client.requestSync("tvm.run_get", params);
      }
    };
    exports.TvmModule = TvmModule;
    var NetErrorCode;
    (function(NetErrorCode2) {
      NetErrorCode2[NetErrorCode2["QueryFailed"] = 601] = "QueryFailed";
      NetErrorCode2[NetErrorCode2["SubscribeFailed"] = 602] = "SubscribeFailed";
      NetErrorCode2[NetErrorCode2["WaitForFailed"] = 603] = "WaitForFailed";
      NetErrorCode2[NetErrorCode2["GetSubscriptionResultFailed"] = 604] = "GetSubscriptionResultFailed";
      NetErrorCode2[NetErrorCode2["InvalidServerResponse"] = 605] = "InvalidServerResponse";
      NetErrorCode2[NetErrorCode2["ClockOutOfSync"] = 606] = "ClockOutOfSync";
      NetErrorCode2[NetErrorCode2["WaitForTimeout"] = 607] = "WaitForTimeout";
      NetErrorCode2[NetErrorCode2["GraphqlError"] = 608] = "GraphqlError";
      NetErrorCode2[NetErrorCode2["NetworkModuleSuspended"] = 609] = "NetworkModuleSuspended";
      NetErrorCode2[NetErrorCode2["WebsocketDisconnected"] = 610] = "WebsocketDisconnected";
      NetErrorCode2[NetErrorCode2["NotSupported"] = 611] = "NotSupported";
      NetErrorCode2[NetErrorCode2["NoEndpointsProvided"] = 612] = "NoEndpointsProvided";
      NetErrorCode2[NetErrorCode2["GraphqlWebsocketInitError"] = 613] = "GraphqlWebsocketInitError";
      NetErrorCode2[NetErrorCode2["NetworkModuleResumed"] = 614] = "NetworkModuleResumed";
      NetErrorCode2[NetErrorCode2["Unauthorized"] = 615] = "Unauthorized";
      NetErrorCode2[NetErrorCode2["QueryTransactionTreeTimeout"] = 616] = "QueryTransactionTreeTimeout";
      NetErrorCode2[NetErrorCode2["GraphqlConnectionError"] = 617] = "GraphqlConnectionError";
      NetErrorCode2[NetErrorCode2["WrongWebscoketProtocolSequence"] = 618] = "WrongWebscoketProtocolSequence";
      NetErrorCode2[NetErrorCode2["ParseUrlFailed"] = 619] = "ParseUrlFailed";
      NetErrorCode2[NetErrorCode2["ModifyUrlFailed"] = 620] = "ModifyUrlFailed";
      NetErrorCode2[NetErrorCode2["SendMessageFailed"] = 621] = "SendMessageFailed";
      NetErrorCode2[NetErrorCode2["NotFound"] = 622] = "NotFound";
      NetErrorCode2[NetErrorCode2["AllAttemptsFailed"] = 623] = "AllAttemptsFailed";
    })(NetErrorCode = exports.NetErrorCode || (exports.NetErrorCode = {}));
    var SortDirection;
    (function(SortDirection2) {
      SortDirection2["ASC"] = "ASC";
      SortDirection2["DESC"] = "DESC";
    })(SortDirection = exports.SortDirection || (exports.SortDirection = {}));
    function paramsOfQueryOperationQueryCollection(params) {
      return Object.assign({ type: "QueryCollection" }, params);
    }
    exports.paramsOfQueryOperationQueryCollection = paramsOfQueryOperationQueryCollection;
    function paramsOfQueryOperationWaitForCollection(params) {
      return Object.assign({ type: "WaitForCollection" }, params);
    }
    exports.paramsOfQueryOperationWaitForCollection = paramsOfQueryOperationWaitForCollection;
    function paramsOfQueryOperationAggregateCollection(params) {
      return Object.assign({ type: "AggregateCollection" }, params);
    }
    exports.paramsOfQueryOperationAggregateCollection = paramsOfQueryOperationAggregateCollection;
    function paramsOfQueryOperationQueryCounterparties(params) {
      return Object.assign({ type: "QueryCounterparties" }, params);
    }
    exports.paramsOfQueryOperationQueryCounterparties = paramsOfQueryOperationQueryCounterparties;
    var AggregationFn;
    (function(AggregationFn2) {
      AggregationFn2["COUNT"] = "COUNT";
      AggregationFn2["MIN"] = "MIN";
      AggregationFn2["MAX"] = "MAX";
      AggregationFn2["SUM"] = "SUM";
      AggregationFn2["AVERAGE"] = "AVERAGE";
    })(AggregationFn = exports.AggregationFn || (exports.AggregationFn = {}));
    var NetModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Performs DAppServer GraphQL query.
       *
       * @param {ParamsOfQuery} params
       * @returns ResultOfQuery
       */
      query(params) {
        return this.client.request("net.query", params);
      }
      /**
       * Performs DAppServer GraphQL query.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfQuery} params
       * @returns ResultOfQuery
       */
      query_sync(params) {
        return this.client.requestSync("net.query", params);
      }
      /**
       * Performs multiple queries per single fetch.
       *
       * @param {ParamsOfBatchQuery} params
       * @returns ResultOfBatchQuery
       */
      batch_query(params) {
        return this.client.request("net.batch_query", params);
      }
      /**
       * Performs multiple queries per single fetch.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfBatchQuery} params
       * @returns ResultOfBatchQuery
       */
      batch_query_sync(params) {
        return this.client.requestSync("net.batch_query", params);
      }
      /**
       * Queries collection data
       *
       * @remarks
       * Queries data that satisfies the `filter` conditions,
       * limits the number of returned records and orders them.
       * The projection fields are limited to `result` fields
       *
       * @param {ParamsOfQueryCollection} params
       * @returns ResultOfQueryCollection
       */
      query_collection(params) {
        return this.client.request("net.query_collection", params);
      }
      /**
       * Queries collection data
       *
       * @remarks
       * Queries data that satisfies the `filter` conditions,
       * limits the number of returned records and orders them.
       * The projection fields are limited to `result` fields
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfQueryCollection} params
       * @returns ResultOfQueryCollection
       */
      query_collection_sync(params) {
        return this.client.requestSync("net.query_collection", params);
      }
      /**
       * Aggregates collection data.
       *
       * @remarks
       * Aggregates values from the specified `fields` for records
       * that satisfies the `filter` conditions,
       *
       * @param {ParamsOfAggregateCollection} params
       * @returns ResultOfAggregateCollection
       */
      aggregate_collection(params) {
        return this.client.request("net.aggregate_collection", params);
      }
      /**
       * Aggregates collection data.
       *
       * @remarks
       * Aggregates values from the specified `fields` for records
       * that satisfies the `filter` conditions,
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfAggregateCollection} params
       * @returns ResultOfAggregateCollection
       */
      aggregate_collection_sync(params) {
        return this.client.requestSync("net.aggregate_collection", params);
      }
      /**
       * Returns an object that fulfills the conditions or waits for its appearance
       *
       * @remarks
       * Triggers only once.
       * If object that satisfies the `filter` conditions
       * already exists - returns it immediately.
       * If not - waits for insert/update of data within the specified `timeout`,
       * and returns it.
       * The projection fields are limited to `result` fields
       *
       * @param {ParamsOfWaitForCollection} params
       * @returns ResultOfWaitForCollection
       */
      wait_for_collection(params) {
        return this.client.request("net.wait_for_collection", params);
      }
      /**
       * Returns an object that fulfills the conditions or waits for its appearance
       *
       * @remarks
       * Triggers only once.
       * If object that satisfies the `filter` conditions
       * already exists - returns it immediately.
       * If not - waits for insert/update of data within the specified `timeout`,
       * and returns it.
       * The projection fields are limited to `result` fields
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfWaitForCollection} params
       * @returns ResultOfWaitForCollection
       */
      wait_for_collection_sync(params) {
        return this.client.requestSync("net.wait_for_collection", params);
      }
      /**
       * Cancels a subscription
       *
       * @remarks
       * Cancels a subscription specified by its handle.
       *
       * @param {ResultOfSubscribeCollection} params
       * @returns
       */
      unsubscribe(params) {
        return this.client.request("net.unsubscribe", params);
      }
      /**
       * Cancels a subscription
       *
       * @remarks
       * Cancels a subscription specified by its handle.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ResultOfSubscribeCollection} params
       * @returns
       */
      unsubscribe_sync(params) {
        this.client.requestSync("net.unsubscribe", params);
      }
      /**
       * Creates a collection subscription
       *
       * @remarks
       * Triggers for each insert/update of data that satisfies
       * the `filter` conditions.
       * The projection fields are limited to `result` fields.
       *
       * The subscription is a persistent communication channel between
       * client and Free TON Network.
       * All changes in the blockchain will be reflected in realtime.
       * Changes means inserts and updates of the blockchain entities.
       *
       * ### Important Notes on Subscriptions
       *
       * Unfortunately sometimes the connection with the network brakes down.
       * In this situation the library attempts to reconnect to the network.
       * This reconnection sequence can take significant time.
       * All of this time the client is disconnected from the network.
       *
       * Bad news is that all blockchain changes that happened while
       * the client was disconnected are lost.
       *
       * Good news is that the client report errors to the callback when
       * it loses and resumes connection.
       *
       * So, if the lost changes are important to the application then
       * the application must handle these error reports.
       *
       * Library reports errors with `responseType` == 101
       * and the error object passed via `params`.
       *
       * When the library has successfully reconnected
       * the application receives callback with
       * `responseType` == 101 and `params.code` == 614 (NetworkModuleResumed).
       *
       * Application can use several ways to handle this situation:
       * - If application monitors changes for the single blockchain
       * object (for example specific account):  application
       * can perform a query for this object and handle actual data as a
       * regular data from the subscription.
       * - If application monitors sequence of some blockchain objects
       * (for example transactions of the specific account): application must
       * refresh all cached (or visible to user) lists where this sequences presents.
       *
       * @param {ParamsOfSubscribeCollection} params
       * @returns ResultOfSubscribeCollection
       */
      subscribe_collection(params, responseHandler) {
        return this.client.request("net.subscribe_collection", params, responseHandler);
      }
      /**
       * Creates a collection subscription
       *
       * @remarks
       * Triggers for each insert/update of data that satisfies
       * the `filter` conditions.
       * The projection fields are limited to `result` fields.
       *
       * The subscription is a persistent communication channel between
       * client and Free TON Network.
       * All changes in the blockchain will be reflected in realtime.
       * Changes means inserts and updates of the blockchain entities.
       *
       * ### Important Notes on Subscriptions
       *
       * Unfortunately sometimes the connection with the network brakes down.
       * In this situation the library attempts to reconnect to the network.
       * This reconnection sequence can take significant time.
       * All of this time the client is disconnected from the network.
       *
       * Bad news is that all blockchain changes that happened while
       * the client was disconnected are lost.
       *
       * Good news is that the client report errors to the callback when
       * it loses and resumes connection.
       *
       * So, if the lost changes are important to the application then
       * the application must handle these error reports.
       *
       * Library reports errors with `responseType` == 101
       * and the error object passed via `params`.
       *
       * When the library has successfully reconnected
       * the application receives callback with
       * `responseType` == 101 and `params.code` == 614 (NetworkModuleResumed).
       *
       * Application can use several ways to handle this situation:
       * - If application monitors changes for the single blockchain
       * object (for example specific account):  application
       * can perform a query for this object and handle actual data as a
       * regular data from the subscription.
       * - If application monitors sequence of some blockchain objects
       * (for example transactions of the specific account): application must
       * refresh all cached (or visible to user) lists where this sequences presents.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSubscribeCollection} params
       * @returns ResultOfSubscribeCollection
       */
      subscribe_collection_sync(params) {
        return this.client.requestSync("net.subscribe_collection", params);
      }
      /**
       * Creates a subscription (Deprecated)
       *
       * @remarks
       * The subscription is a persistent communication channel between
       * client and Acki Nacki Network.
       *
       * ### Important Notes on Subscriptions
       *
       * Unfortunately sometimes the connection with the network breaks down.
       * In this situation the library attempts to reconnect to the network.
       * This reconnection sequence can take significant time.
       * All of this time the client is disconnected from the network.
       *
       * Bad news is that all changes that happened while
       * the client was disconnected are lost.
       *
       * Good news is that the client report errors to the callback when
       * it loses and resumes connection.
       *
       * So, if the lost changes are important to the application then
       * the application must handle these error reports.
       *
       * Library reports errors with `responseType` == 101
       * and the error object passed via `params`.
       *
       * When the library has successfully reconnected
       * the application receives callback with
       * `responseType` == 101 and `params.code` == 614 (NetworkModuleResumed).
       *
       * Application can use several ways to handle this situation:
       * - If application monitors changes for the single
       * object (for example specific account):  application
       * can perform a query for this object and handle actual data as a
       * regular data from the subscription.
       * - If application monitors sequence of some objects
       * (for example transactions of the specific account): application must
       * refresh all cached (or visible to user) lists where this sequences presents.
       *
       * @param {ParamsOfSubscribe} params
       * @returns ResultOfSubscribeCollection
       */
      subscribe(params, responseHandler) {
        return this.client.request("net.subscribe", params, responseHandler);
      }
      /**
       * Creates a subscription (Deprecated)
       *
       * @remarks
       * The subscription is a persistent communication channel between
       * client and Acki Nacki Network.
       *
       * ### Important Notes on Subscriptions
       *
       * Unfortunately sometimes the connection with the network breaks down.
       * In this situation the library attempts to reconnect to the network.
       * This reconnection sequence can take significant time.
       * All of this time the client is disconnected from the network.
       *
       * Bad news is that all changes that happened while
       * the client was disconnected are lost.
       *
       * Good news is that the client report errors to the callback when
       * it loses and resumes connection.
       *
       * So, if the lost changes are important to the application then
       * the application must handle these error reports.
       *
       * Library reports errors with `responseType` == 101
       * and the error object passed via `params`.
       *
       * When the library has successfully reconnected
       * the application receives callback with
       * `responseType` == 101 and `params.code` == 614 (NetworkModuleResumed).
       *
       * Application can use several ways to handle this situation:
       * - If application monitors changes for the single
       * object (for example specific account):  application
       * can perform a query for this object and handle actual data as a
       * regular data from the subscription.
       * - If application monitors sequence of some objects
       * (for example transactions of the specific account): application must
       * refresh all cached (or visible to user) lists where this sequences presents.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSubscribe} params
       * @returns ResultOfSubscribeCollection
       */
      subscribe_sync(params) {
        return this.client.requestSync("net.subscribe", params);
      }
      /**
       * Suspends network module to stop any network activity
       * @returns
       */
      suspend() {
        return this.client.request("net.suspend");
      }
      /**
       * Suspends network module to stop any network activity
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns
       */
      suspend_sync() {
        this.client.requestSync("net.suspend");
      }
      /**
       * Resumes network module to enable network activity
       * @returns
       */
      resume() {
        return this.client.request("net.resume");
      }
      /**
       * Resumes network module to enable network activity
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns
       */
      resume_sync() {
        this.client.requestSync("net.resume");
      }
      /**
       * Returns ID of the last block in a specified account shard
       *
       * @param {ParamsOfFindLastShardBlock} params
       * @returns ResultOfFindLastShardBlock
       */
      find_last_shard_block(params) {
        return this.client.request("net.find_last_shard_block", params);
      }
      /**
       * Returns ID of the last block in a specified account shard
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfFindLastShardBlock} params
       * @returns ResultOfFindLastShardBlock
       */
      find_last_shard_block_sync(params) {
        return this.client.requestSync("net.find_last_shard_block", params);
      }
      /**
       * Requests the list of alternative endpoints from server
       * @returns EndpointsSet
       */
      fetch_endpoints() {
        return this.client.request("net.fetch_endpoints");
      }
      /**
       * Requests the list of alternative endpoints from server
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns EndpointsSet
       */
      fetch_endpoints_sync() {
        return this.client.requestSync("net.fetch_endpoints");
      }
      /**
       * Sets the list of endpoints to use on reinit
       *
       * @param {EndpointsSet} params
       * @returns
       */
      set_endpoints(params) {
        return this.client.request("net.set_endpoints", params);
      }
      /**
       * Sets the list of endpoints to use on reinit
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {EndpointsSet} params
       * @returns
       */
      set_endpoints_sync(params) {
        this.client.requestSync("net.set_endpoints", params);
      }
      /**
       * Requests the list of alternative endpoints from server
       * @returns ResultOfGetEndpoints
       */
      get_endpoints() {
        return this.client.request("net.get_endpoints");
      }
      /**
       * Requests the list of alternative endpoints from server
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ResultOfGetEndpoints
       */
      get_endpoints_sync() {
        return this.client.requestSync("net.get_endpoints");
      }
      /**
       * Allows to query and paginate through the list of accounts that the specified account has interacted with, sorted by the time of the last internal message between accounts
       *
       * @remarks
       * *Attention* this query retrieves data from 'Counterparties' service which is
       * not supported in the opensource version of DApp Server (and will not be
       * supported) as well as in Evernode SE (will be supported in SE in future),
       * but is always accessible via [EVER OS Clouds](../ton-os-api/networks.md)
       *
       * @param {ParamsOfQueryCounterparties} params
       * @returns ResultOfQueryCollection
       */
      query_counterparties(params) {
        return this.client.request("net.query_counterparties", params);
      }
      /**
       * Allows to query and paginate through the list of accounts that the specified account has interacted with, sorted by the time of the last internal message between accounts
       *
       * @remarks
       * *Attention* this query retrieves data from 'Counterparties' service which is
       * not supported in the opensource version of DApp Server (and will not be
       * supported) as well as in Evernode SE (will be supported in SE in future),
       * but is always accessible via [EVER OS Clouds](../ton-os-api/networks.md)
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfQueryCounterparties} params
       * @returns ResultOfQueryCollection
       */
      query_counterparties_sync(params) {
        return this.client.requestSync("net.query_counterparties", params);
      }
      /**
       * Returns a tree of transactions triggered by a specific message.
       *
       * @remarks
       * Performs recursive retrieval of a transactions tree produced by a specific
       * message: in_msg -> dst_transaction -> out_messages -> dst_transaction -> ...
       * If the chain of transactions execution is in progress while the function is
       * running, it will wait for the next transactions to appear until the full
       * tree or more than 50 transactions are received.
       *
       * All the retrieved messages and transactions are included
       * into `result.messages` and `result.transactions` respectively.
       *
       * Function reads transactions layer by layer, by pages of 20 transactions.
       *
       * The retrieval process goes like this:
       * Let's assume we have an infinite chain of transactions and each transaction
       * generates 5 messages.
       * 1. Retrieve 1st message (input parameter) and corresponding transaction -
       *    put it into result.
       * It is the first level of the tree of transactions - its root.
       * Retrieve 5 out message ids from the transaction for next steps.
       * 2. Retrieve 5 messages and corresponding transactions on the 2nd layer. Put
       *    them into result.
       * Retrieve 5*5 out message ids from these transactions for next steps
       * 3. Retrieve 20 (size of the page) messages and transactions (3rd layer) and
       *    20*5=100 message ids (4th layer).
       * 4. Retrieve the last 5 messages and 5 transactions on the 3rd layer + 15
       *    messages and transactions (of 100) from the 4th layer
       * + 25 message ids of the 4th layer + 75 message ids of the 5th layer.
       * 5. Retrieve 20 more messages and 20 more transactions of the 4th layer + 100
       *    more message ids of the 5th layer.
       * 6. Now we have 1+5+20+20+20 = 66 transactions, which is more than 50.
       *    Function exits with the tree of
       * 1m->1t->5m->5t->25m->25t->35m->35t. If we see any message ids in the last
       * transactions out_msgs, which don't have corresponding messages in the
       * function result, it means that the full tree was not received and we need to
       * continue iteration.
       *
       * To summarize, it is guaranteed that each message in `result.messages` has
       * the corresponding transaction in the `result.transactions`.
       * But there is no guarantee that all messages from transactions `out_msgs` are
       * presented in `result.messages`.
       * So the application has to continue retrieval for missing messages if it
       * requires.
       *
       * @param {ParamsOfQueryTransactionTree} params
       * @returns ResultOfQueryTransactionTree
       */
      query_transaction_tree(params) {
        return this.client.request("net.query_transaction_tree", params);
      }
      /**
       * Returns a tree of transactions triggered by a specific message.
       *
       * @remarks
       * Performs recursive retrieval of a transactions tree produced by a specific
       * message: in_msg -> dst_transaction -> out_messages -> dst_transaction -> ...
       * If the chain of transactions execution is in progress while the function is
       * running, it will wait for the next transactions to appear until the full
       * tree or more than 50 transactions are received.
       *
       * All the retrieved messages and transactions are included
       * into `result.messages` and `result.transactions` respectively.
       *
       * Function reads transactions layer by layer, by pages of 20 transactions.
       *
       * The retrieval process goes like this:
       * Let's assume we have an infinite chain of transactions and each transaction
       * generates 5 messages.
       * 1. Retrieve 1st message (input parameter) and corresponding transaction -
       *    put it into result.
       * It is the first level of the tree of transactions - its root.
       * Retrieve 5 out message ids from the transaction for next steps.
       * 2. Retrieve 5 messages and corresponding transactions on the 2nd layer. Put
       *    them into result.
       * Retrieve 5*5 out message ids from these transactions for next steps
       * 3. Retrieve 20 (size of the page) messages and transactions (3rd layer) and
       *    20*5=100 message ids (4th layer).
       * 4. Retrieve the last 5 messages and 5 transactions on the 3rd layer + 15
       *    messages and transactions (of 100) from the 4th layer
       * + 25 message ids of the 4th layer + 75 message ids of the 5th layer.
       * 5. Retrieve 20 more messages and 20 more transactions of the 4th layer + 100
       *    more message ids of the 5th layer.
       * 6. Now we have 1+5+20+20+20 = 66 transactions, which is more than 50.
       *    Function exits with the tree of
       * 1m->1t->5m->5t->25m->25t->35m->35t. If we see any message ids in the last
       * transactions out_msgs, which don't have corresponding messages in the
       * function result, it means that the full tree was not received and we need to
       * continue iteration.
       *
       * To summarize, it is guaranteed that each message in `result.messages` has
       * the corresponding transaction in the `result.transactions`.
       * But there is no guarantee that all messages from transactions `out_msgs` are
       * presented in `result.messages`.
       * So the application has to continue retrieval for missing messages if it
       * requires.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfQueryTransactionTree} params
       * @returns ResultOfQueryTransactionTree
       */
      query_transaction_tree_sync(params) {
        return this.client.requestSync("net.query_transaction_tree", params);
      }
      /**
       * Creates block iterator.
       *
       * @remarks
       * Block iterator uses robust iteration methods that guaranties that every
       * block in the specified range isn't missed or iterated twice.
       *
       * Iterated range can be reduced with some filters:
       * - `start_time` – the bottom time range. Only blocks with `gen_utime`
       * more or equal to this value is iterated. If this parameter is omitted then
       * there is no bottom time edge, so all blocks since zero state is iterated.
       * - `end_time` – the upper time range. Only blocks with `gen_utime`
       * less then this value is iterated. If this parameter is omitted then there is
       * no upper time edge, so iterator never finishes.
       * - `shard_filter` – workchains and shard prefixes that reduce the set of
       *   interesting
       * blocks. Block conforms to the shard filter if it belongs to the filter
       * workchain and the first bits of block's `shard` fields matches to the shard
       * prefix. Only blocks with suitable shard are iterated.
       *
       * Items iterated is a JSON objects with block data. The minimal set of
       * returned fields is:
       * ```text
       * id
       * gen_utime
       * workchain_id
       * shard
       * after_split
       * after_merge
       * prev_ref {
       *     root_hash
       * }
       * prev_alt_ref {
       *     root_hash
       * }
       * ```
       * Application can request additional fields in the `result` parameter.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * @param {ParamsOfCreateBlockIterator} params
       * @returns RegisteredIterator
       */
      create_block_iterator(params) {
        return this.client.request("net.create_block_iterator", params);
      }
      /**
       * Creates block iterator.
       *
       * @remarks
       * Block iterator uses robust iteration methods that guaranties that every
       * block in the specified range isn't missed or iterated twice.
       *
       * Iterated range can be reduced with some filters:
       * - `start_time` – the bottom time range. Only blocks with `gen_utime`
       * more or equal to this value is iterated. If this parameter is omitted then
       * there is no bottom time edge, so all blocks since zero state is iterated.
       * - `end_time` – the upper time range. Only blocks with `gen_utime`
       * less then this value is iterated. If this parameter is omitted then there is
       * no upper time edge, so iterator never finishes.
       * - `shard_filter` – workchains and shard prefixes that reduce the set of
       *   interesting
       * blocks. Block conforms to the shard filter if it belongs to the filter
       * workchain and the first bits of block's `shard` fields matches to the shard
       * prefix. Only blocks with suitable shard are iterated.
       *
       * Items iterated is a JSON objects with block data. The minimal set of
       * returned fields is:
       * ```text
       * id
       * gen_utime
       * workchain_id
       * shard
       * after_split
       * after_merge
       * prev_ref {
       *     root_hash
       * }
       * prev_alt_ref {
       *     root_hash
       * }
       * ```
       * Application can request additional fields in the `result` parameter.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCreateBlockIterator} params
       * @returns RegisteredIterator
       */
      create_block_iterator_sync(params) {
        return this.client.requestSync("net.create_block_iterator", params);
      }
      /**
       * Resumes block iterator.
       *
       * @remarks
       * The iterator stays exactly at the same position where the `resume_state` was
       * caught.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * @param {ParamsOfResumeBlockIterator} params
       * @returns RegisteredIterator
       */
      resume_block_iterator(params) {
        return this.client.request("net.resume_block_iterator", params);
      }
      /**
       * Resumes block iterator.
       *
       * @remarks
       * The iterator stays exactly at the same position where the `resume_state` was
       * caught.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfResumeBlockIterator} params
       * @returns RegisteredIterator
       */
      resume_block_iterator_sync(params) {
        return this.client.requestSync("net.resume_block_iterator", params);
      }
      /**
       * Creates transaction iterator.
       *
       * @remarks
       * Transaction iterator uses robust iteration methods that guaranty that every
       * transaction in the specified range isn't missed or iterated twice.
       *
       * Iterated range can be reduced with some filters:
       * - `start_time` – the bottom time range. Only transactions with `now`
       * more or equal to this value are iterated. If this parameter is omitted then
       * there is no bottom time edge, so all the transactions since zero state are
       * iterated.
       * - `end_time` – the upper time range. Only transactions with `now`
       * less then this value are iterated. If this parameter is omitted then there
       * is no upper time edge, so iterator never finishes.
       * - `shard_filter` – workchains and shard prefixes that reduce the set of
       *   interesting
       * accounts. Account address conforms to the shard filter if
       * it belongs to the filter workchain and the first bits of address match to
       * the shard prefix. Only transactions with suitable account addresses are
       * iterated.
       * - `accounts_filter` – set of account addresses whose transactions must be
       *   iterated.
       * Note that accounts filter can conflict with shard filter so application must
       * combine these filters carefully.
       *
       * Iterated item is a JSON objects with transaction data. The minimal set of
       * returned fields is:
       * ```text
       * id
       * account_addr
       * now
       * balance_delta(format:DEC)
       * bounce { bounce_type }
       * in_message {
       *     id
       *     value(format:DEC)
       *     msg_type
       *     src
       * }
       * out_messages {
       *     id
       *     value(format:DEC)
       *     msg_type
       *     dst
       * }
       * ```
       * Application can request an additional fields in the `result` parameter.
       *
       * Another parameter that affects on the returned fields is the
       * `include_transfers`. When this parameter is `true` the iterator computes and
       * adds `transfer` field containing list of the useful `TransactionTransfer`
       * objects. Each transfer is calculated from the particular message related to
       * the transaction and has the following structure:
       * - message – source message identifier.
       * - isBounced – indicates that the transaction is bounced, which means the
       *   value will be returned back to the sender.
       * - isDeposit – indicates that this transfer is the deposit (true) or withdraw
       *   (false).
       * - counterparty – account address of the transfer source or destination
       *   depending on `isDeposit`.
       * - value – amount of nano tokens transferred. The value is represented as a
       *   decimal string
       * because the actual value can be more precise than the JSON number can
       * represent. Application must use this string carefully – conversion to number
       * can follow to loose of precision.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * @param {ParamsOfCreateTransactionIterator} params
       * @returns RegisteredIterator
       */
      create_transaction_iterator(params) {
        return this.client.request("net.create_transaction_iterator", params);
      }
      /**
       * Creates transaction iterator.
       *
       * @remarks
       * Transaction iterator uses robust iteration methods that guaranty that every
       * transaction in the specified range isn't missed or iterated twice.
       *
       * Iterated range can be reduced with some filters:
       * - `start_time` – the bottom time range. Only transactions with `now`
       * more or equal to this value are iterated. If this parameter is omitted then
       * there is no bottom time edge, so all the transactions since zero state are
       * iterated.
       * - `end_time` – the upper time range. Only transactions with `now`
       * less then this value are iterated. If this parameter is omitted then there
       * is no upper time edge, so iterator never finishes.
       * - `shard_filter` – workchains and shard prefixes that reduce the set of
       *   interesting
       * accounts. Account address conforms to the shard filter if
       * it belongs to the filter workchain and the first bits of address match to
       * the shard prefix. Only transactions with suitable account addresses are
       * iterated.
       * - `accounts_filter` – set of account addresses whose transactions must be
       *   iterated.
       * Note that accounts filter can conflict with shard filter so application must
       * combine these filters carefully.
       *
       * Iterated item is a JSON objects with transaction data. The minimal set of
       * returned fields is:
       * ```text
       * id
       * account_addr
       * now
       * balance_delta(format:DEC)
       * bounce { bounce_type }
       * in_message {
       *     id
       *     value(format:DEC)
       *     msg_type
       *     src
       * }
       * out_messages {
       *     id
       *     value(format:DEC)
       *     msg_type
       *     dst
       * }
       * ```
       * Application can request an additional fields in the `result` parameter.
       *
       * Another parameter that affects on the returned fields is the
       * `include_transfers`. When this parameter is `true` the iterator computes and
       * adds `transfer` field containing list of the useful `TransactionTransfer`
       * objects. Each transfer is calculated from the particular message related to
       * the transaction and has the following structure:
       * - message – source message identifier.
       * - isBounced – indicates that the transaction is bounced, which means the
       *   value will be returned back to the sender.
       * - isDeposit – indicates that this transfer is the deposit (true) or withdraw
       *   (false).
       * - counterparty – account address of the transfer source or destination
       *   depending on `isDeposit`.
       * - value – amount of nano tokens transferred. The value is represented as a
       *   decimal string
       * because the actual value can be more precise than the JSON number can
       * represent. Application must use this string carefully – conversion to number
       * can follow to loose of precision.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfCreateTransactionIterator} params
       * @returns RegisteredIterator
       */
      create_transaction_iterator_sync(params) {
        return this.client.requestSync("net.create_transaction_iterator", params);
      }
      /**
       * Resumes transaction iterator.
       *
       * @remarks
       * The iterator stays exactly at the same position where the `resume_state` was
       * caught. Note that `resume_state` doesn't store the account filter. If the
       * application requires to use the same account filter as it was when the
       * iterator was created then the application must pass the account filter again
       * in `accounts_filter` parameter.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * @param {ParamsOfResumeTransactionIterator} params
       * @returns RegisteredIterator
       */
      resume_transaction_iterator(params) {
        return this.client.request("net.resume_transaction_iterator", params);
      }
      /**
       * Resumes transaction iterator.
       *
       * @remarks
       * The iterator stays exactly at the same position where the `resume_state` was
       * caught. Note that `resume_state` doesn't store the account filter. If the
       * application requires to use the same account filter as it was when the
       * iterator was created then the application must pass the account filter again
       * in `accounts_filter` parameter.
       *
       * Application should call the `remove_iterator` when iterator is no longer
       * required.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfResumeTransactionIterator} params
       * @returns RegisteredIterator
       */
      resume_transaction_iterator_sync(params) {
        return this.client.requestSync("net.resume_transaction_iterator", params);
      }
      /**
       * Returns next available items.
       *
       * @remarks
       * In addition to available items this function returns the `has_more` flag
       * indicating that the iterator isn't reach the end of the iterated range yet.
       *
       * This function can return the empty list of available items but
       * indicates that there are more items is available.
       * This situation appears when the iterator doesn't reach iterated range
       * but database doesn't contains available items yet.
       *
       * If application requests resume state in `return_resume_state` parameter
       * then this function returns `resume_state` that can be used later to
       * resume the iteration from the position after returned items.
       *
       * The structure of the items returned depends on the iterator used.
       * See the description to the appropriated iterator creation function.
       *
       * @param {ParamsOfIteratorNext} params
       * @returns ResultOfIteratorNext
       */
      iterator_next(params) {
        return this.client.request("net.iterator_next", params);
      }
      /**
       * Returns next available items.
       *
       * @remarks
       * In addition to available items this function returns the `has_more` flag
       * indicating that the iterator isn't reach the end of the iterated range yet.
       *
       * This function can return the empty list of available items but
       * indicates that there are more items is available.
       * This situation appears when the iterator doesn't reach iterated range
       * but database doesn't contains available items yet.
       *
       * If application requests resume state in `return_resume_state` parameter
       * then this function returns `resume_state` that can be used later to
       * resume the iteration from the position after returned items.
       *
       * The structure of the items returned depends on the iterator used.
       * See the description to the appropriated iterator creation function.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfIteratorNext} params
       * @returns ResultOfIteratorNext
       */
      iterator_next_sync(params) {
        return this.client.requestSync("net.iterator_next", params);
      }
      /**
       * Removes an iterator
       *
       * @remarks
       * Frees all resources allocated in library to serve iterator.
       *
       * Application always should call the `remove_iterator` when iterator
       * is no longer required.
       *
       * @param {RegisteredIterator} params
       * @returns
       */
      remove_iterator(params) {
        return this.client.request("net.remove_iterator", params);
      }
      /**
       * Removes an iterator
       *
       * @remarks
       * Frees all resources allocated in library to serve iterator.
       *
       * Application always should call the `remove_iterator` when iterator
       * is no longer required.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {RegisteredIterator} params
       * @returns
       */
      remove_iterator_sync(params) {
        this.client.requestSync("net.remove_iterator", params);
      }
      /**
       * Returns signature ID for configured network if it should be used in messages signature
       * @returns ResultOfGetSignatureId
       */
      get_signature_id() {
        return this.client.request("net.get_signature_id");
      }
      /**
       * Returns signature ID for configured network if it should be used in messages signature
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       * @returns ResultOfGetSignatureId
       */
      get_signature_id_sync() {
        return this.client.requestSync("net.get_signature_id");
      }
    };
    exports.NetModule = NetModule;
    var DebotErrorCode;
    (function(DebotErrorCode2) {
      DebotErrorCode2[DebotErrorCode2["DebotStartFailed"] = 801] = "DebotStartFailed";
      DebotErrorCode2[DebotErrorCode2["DebotFetchFailed"] = 802] = "DebotFetchFailed";
      DebotErrorCode2[DebotErrorCode2["DebotExecutionFailed"] = 803] = "DebotExecutionFailed";
      DebotErrorCode2[DebotErrorCode2["DebotInvalidHandle"] = 804] = "DebotInvalidHandle";
      DebotErrorCode2[DebotErrorCode2["DebotInvalidJsonParams"] = 805] = "DebotInvalidJsonParams";
      DebotErrorCode2[DebotErrorCode2["DebotInvalidFunctionId"] = 806] = "DebotInvalidFunctionId";
      DebotErrorCode2[DebotErrorCode2["DebotInvalidAbi"] = 807] = "DebotInvalidAbi";
      DebotErrorCode2[DebotErrorCode2["DebotGetMethodFailed"] = 808] = "DebotGetMethodFailed";
      DebotErrorCode2[DebotErrorCode2["DebotInvalidMsg"] = 809] = "DebotInvalidMsg";
      DebotErrorCode2[DebotErrorCode2["DebotExternalCallFailed"] = 810] = "DebotExternalCallFailed";
      DebotErrorCode2[DebotErrorCode2["DebotBrowserCallbackFailed"] = 811] = "DebotBrowserCallbackFailed";
      DebotErrorCode2[DebotErrorCode2["DebotOperationRejected"] = 812] = "DebotOperationRejected";
      DebotErrorCode2[DebotErrorCode2["DebotNoCode"] = 813] = "DebotNoCode";
    })(DebotErrorCode = exports.DebotErrorCode || (exports.DebotErrorCode = {}));
    function debotActivityTransaction(msg, dst, out, fee, setcode, signkey, signing_box_handle) {
      return {
        type: "Transaction",
        msg,
        dst,
        out,
        fee,
        setcode,
        signkey,
        signing_box_handle
      };
    }
    exports.debotActivityTransaction = debotActivityTransaction;
    function paramsOfAppDebotBrowserLog(msg) {
      return {
        type: "Log",
        msg
      };
    }
    exports.paramsOfAppDebotBrowserLog = paramsOfAppDebotBrowserLog;
    function paramsOfAppDebotBrowserSwitch(context_id) {
      return {
        type: "Switch",
        context_id
      };
    }
    exports.paramsOfAppDebotBrowserSwitch = paramsOfAppDebotBrowserSwitch;
    function paramsOfAppDebotBrowserSwitchCompleted() {
      return {
        type: "SwitchCompleted"
      };
    }
    exports.paramsOfAppDebotBrowserSwitchCompleted = paramsOfAppDebotBrowserSwitchCompleted;
    function paramsOfAppDebotBrowserShowAction(action) {
      return {
        type: "ShowAction",
        action
      };
    }
    exports.paramsOfAppDebotBrowserShowAction = paramsOfAppDebotBrowserShowAction;
    function paramsOfAppDebotBrowserInput(prompt) {
      return {
        type: "Input",
        prompt
      };
    }
    exports.paramsOfAppDebotBrowserInput = paramsOfAppDebotBrowserInput;
    function paramsOfAppDebotBrowserGetSigningBox() {
      return {
        type: "GetSigningBox"
      };
    }
    exports.paramsOfAppDebotBrowserGetSigningBox = paramsOfAppDebotBrowserGetSigningBox;
    function paramsOfAppDebotBrowserInvokeDebot(debot_addr, action) {
      return {
        type: "InvokeDebot",
        debot_addr,
        action
      };
    }
    exports.paramsOfAppDebotBrowserInvokeDebot = paramsOfAppDebotBrowserInvokeDebot;
    function paramsOfAppDebotBrowserSend(message) {
      return {
        type: "Send",
        message
      };
    }
    exports.paramsOfAppDebotBrowserSend = paramsOfAppDebotBrowserSend;
    function paramsOfAppDebotBrowserApprove(activity) {
      return {
        type: "Approve",
        activity
      };
    }
    exports.paramsOfAppDebotBrowserApprove = paramsOfAppDebotBrowserApprove;
    function resultOfAppDebotBrowserInput(value) {
      return {
        type: "Input",
        value
      };
    }
    exports.resultOfAppDebotBrowserInput = resultOfAppDebotBrowserInput;
    function resultOfAppDebotBrowserGetSigningBox(signing_box) {
      return {
        type: "GetSigningBox",
        signing_box
      };
    }
    exports.resultOfAppDebotBrowserGetSigningBox = resultOfAppDebotBrowserGetSigningBox;
    function resultOfAppDebotBrowserInvokeDebot() {
      return {
        type: "InvokeDebot"
      };
    }
    exports.resultOfAppDebotBrowserInvokeDebot = resultOfAppDebotBrowserInvokeDebot;
    function resultOfAppDebotBrowserApprove(approved) {
      return {
        type: "Approve",
        approved
      };
    }
    exports.resultOfAppDebotBrowserApprove = resultOfAppDebotBrowserApprove;
    function dispatchAppDebotBrowser(obj, params, app_request_id, client2) {
      return __awaiter(this, void 0, void 0, function* () {
        try {
          let result = {};
          switch (params.type) {
            case "Log":
              obj.log(params);
              break;
            case "Switch":
              obj.switch(params);
              break;
            case "SwitchCompleted":
              obj.switch_completed();
              break;
            case "ShowAction":
              obj.show_action(params);
              break;
            case "Input":
              result = yield obj.input(params);
              break;
            case "GetSigningBox":
              result = yield obj.get_signing_box();
              break;
            case "InvokeDebot":
              yield obj.invoke_debot(params);
              break;
            case "Send":
              obj.send(params);
              break;
            case "Approve":
              result = yield obj.approve(params);
              break;
          }
          client2.resolve_app_request(app_request_id, Object.assign({ type: params.type }, result));
        } catch (error) {
          client2.reject_app_request(app_request_id, error);
        }
      });
    }
    var DebotModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Creates and instance of DeBot.
       *
       * @remarks
       * Downloads debot smart contract (code and data) from blockchain and creates
       * an instance of Debot Engine for it.
       *
       * # Remarks
       * It does not switch debot to context 0. Browser Callbacks are not called.
       *
       * @param {ParamsOfInit} params
       * @returns RegisteredDebot
       */
      init(params, obj) {
        return this.client.request("debot.init", params, (params2, responseType) => {
          if (responseType === 3) {
            dispatchAppDebotBrowser(obj, params2.request_data, params2.app_request_id, this.client);
          } else if (responseType === 4) {
            dispatchAppDebotBrowser(obj, params2, null, this.client);
          }
        });
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Creates and instance of DeBot.
       *
       * @remarks
       * Downloads debot smart contract (code and data) from blockchain and creates
       * an instance of Debot Engine for it.
       *
       * # Remarks
       * It does not switch debot to context 0. Browser Callbacks are not called.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfInit} params
       * @returns RegisteredDebot
       */
      init_sync(params) {
        return this.client.requestSync("debot.init", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Starts the DeBot.
       *
       * @remarks
       * Downloads debot smart contract from blockchain and switches it to
       * context zero.
       *
       * This function must be used by Debot Browser to start a dialog with debot.
       * While the function is executing, several Browser Callbacks can be called,
       * since the debot tries to display all actions from the context 0 to the user.
       *
       * When the debot starts SDK registers `BrowserCallbacks` AppObject.
       * Therefore when `debote.remove` is called the debot is being deleted and the
       * callback is called with `finish`=`true` which indicates that it will never
       * be used again.
       *
       * @param {ParamsOfStart} params
       * @returns
       */
      start(params) {
        return this.client.request("debot.start", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Starts the DeBot.
       *
       * @remarks
       * Downloads debot smart contract from blockchain and switches it to
       * context zero.
       *
       * This function must be used by Debot Browser to start a dialog with debot.
       * While the function is executing, several Browser Callbacks can be called,
       * since the debot tries to display all actions from the context 0 to the user.
       *
       * When the debot starts SDK registers `BrowserCallbacks` AppObject.
       * Therefore when `debote.remove` is called the debot is being deleted and the
       * callback is called with `finish`=`true` which indicates that it will never
       * be used again.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfStart} params
       * @returns
       */
      start_sync(params) {
        this.client.requestSync("debot.start", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Fetches DeBot metadata from blockchain.
       *
       * @remarks
       * Downloads DeBot from blockchain and creates and fetches its metadata.
       *
       * @param {ParamsOfFetch} params
       * @returns ResultOfFetch
       */
      fetch(params) {
        return this.client.request("debot.fetch", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Fetches DeBot metadata from blockchain.
       *
       * @remarks
       * Downloads DeBot from blockchain and creates and fetches its metadata.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfFetch} params
       * @returns ResultOfFetch
       */
      fetch_sync(params) {
        return this.client.requestSync("debot.fetch", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Executes debot action.
       *
       * @remarks
       * Calls debot engine referenced by debot handle to execute input action.
       * Calls Debot Browser Callbacks if needed.
       *
       * # Remarks
       * Chain of actions can be executed if input action generates a list of
       * subactions.
       *
       * @param {ParamsOfExecute} params
       * @returns
       */
      execute(params) {
        return this.client.request("debot.execute", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Executes debot action.
       *
       * @remarks
       * Calls debot engine referenced by debot handle to execute input action.
       * Calls Debot Browser Callbacks if needed.
       *
       * # Remarks
       * Chain of actions can be executed if input action generates a list of
       * subactions.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfExecute} params
       * @returns
       */
      execute_sync(params) {
        this.client.requestSync("debot.execute", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Sends message to Debot.
       *
       * @remarks
       * Used by Debot Browser to send response on Dinterface call or from other
       * Debots.
       *
       * @param {ParamsOfSend} params
       * @returns
       */
      send(params) {
        return this.client.request("debot.send", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Sends message to Debot.
       *
       * @remarks
       * Used by Debot Browser to send response on Dinterface call or from other
       * Debots.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfSend} params
       * @returns
       */
      send_sync(params) {
        this.client.requestSync("debot.send", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Destroys debot handle.
       *
       * @remarks
       * Removes handle from Client Context and drops debot engine referenced by that
       * handle.
       *
       * @param {ParamsOfRemove} params
       * @returns
       */
      remove(params) {
        return this.client.request("debot.remove", params);
      }
      /**
       * [UNSTABLE](UNSTABLE.md) [DEPRECATED](DEPRECATED.md) Destroys debot handle.
       *
       * @remarks
       * Removes handle from Client Context and drops debot engine referenced by that
       * handle.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfRemove} params
       * @returns
       */
      remove_sync(params) {
        this.client.requestSync("debot.remove", params);
      }
    };
    exports.DebotModule = DebotModule;
    var ProofsErrorCode;
    (function(ProofsErrorCode2) {
      ProofsErrorCode2[ProofsErrorCode2["InvalidData"] = 901] = "InvalidData";
      ProofsErrorCode2[ProofsErrorCode2["ProofCheckFailed"] = 902] = "ProofCheckFailed";
      ProofsErrorCode2[ProofsErrorCode2["InternalError"] = 903] = "InternalError";
      ProofsErrorCode2[ProofsErrorCode2["DataDiffersFromProven"] = 904] = "DataDiffersFromProven";
    })(ProofsErrorCode = exports.ProofsErrorCode || (exports.ProofsErrorCode = {}));
    var ProofsModule = class {
      constructor(client2) {
        this.client = client2;
      }
      /**
       * Proves that a given block's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function checks block proofs and compares given data with the proven.
       * If the given data differs from the proven, the exception will be thrown.
       * The input param is a single block's JSON object, which was queried from DApp
       * server using functions such as `net.query`, `net.query_collection` or
       * `net.wait_for_collection`. If block's BOC is not provided in the JSON, it
       * will be queried from DApp server (in this case it is required to provide at
       * least `id` of block).
       *
       * Please note, that joins (like `signatures` in `Block`) are separated
       * entities and not supported, so function will throw an exception in a case if
       * JSON being checked has such entities in it.
       *
       * If `cache_in_local_storage` in config is set to `true` (default), downloaded
       * proofs and master-chain BOCs are saved into the persistent local storage
       * (e.g. file system for native environments or browser's IndexedDB for the
       * web); otherwise all the data is cached only in memory in current client's
       * context and will be lost after destruction of the client.
       *
       * **Why Proofs are needed**
       *
       * Proofs are needed to ensure that the data downloaded from a DApp server is
       * real blockchain data. Checking proofs can protect from the malicious DApp
       * server which can potentially provide fake data, or also from "Man in the
       * Middle" attacks class.
       *
       * **What Proofs are**
       *
       * Simply, proof is a list of signatures of validators', which have signed this
       * particular master- block.
       *
       * The very first validator set's public keys are included in the zero-state.
       * Whe know a root hash of the zero-state, because it is stored in the network
       * configuration file, it is our authority root. For proving zero-state it is
       * enough to calculate and compare its root hash.
       *
       * In each new validator cycle the validator set is changed. The new one is
       * stored in a key-block, which is signed by the validator set, which we
       * already trust, the next validator set will be stored to the new key-block
       * and signed by the current validator set, and so on.
       *
       * In order to prove any block in the master-chain we need to check, that it
       * has been signed by a trusted validator set. So we need to check all
       * key-blocks' proofs, started from the zero-state and until the block, which
       * we want to prove. But it can take a lot of time and traffic to download and
       * prove all key-blocks on a client. For solving this, special trusted blocks
       * are used in Ever-SDK.
       *
       * The trusted block is the authority root, as well, as the zero-state. Each
       * trusted block is the `id` (e.g. `root_hash`) of the already proven
       * key-block. There can be plenty of trusted blocks, so there can be a lot of
       * authority roots. The hashes of trusted blocks for MainNet and DevNet are
       * hardcoded in SDK in a separated binary file (trusted_key_blocks.bin) and is
       * being updated for each release by using `update_trusted_blocks` utility.
       *
       * See [update_trusted_blocks](../../../tools/update_trusted_blocks) directory
       * for more info.
       *
       * In future SDK releases, one will also be able to provide their hashes of
       * trusted blocks for other networks, besides for MainNet and DevNet.
       * By using trusted key-blocks, in order to prove any block, we can prove chain
       * of key-blocks to the closest previous trusted key-block, not only to the
       * zero-state.
       *
       * But shard-blocks don't have proofs on DApp server. In this case, in order to
       * prove any shard- block data, we search for a corresponding master-block,
       * which contains the root hash of this shard-block, or some shard block which
       * is linked to that block in shard-chain. After proving this master-block, we
       * traverse through each link and calculate and compare hashes with links,
       * one-by-one. After that we can ensure that this shard-block has also been
       * proven.
       *
       * @param {ParamsOfProofBlockData} params
       * @returns
       */
      proof_block_data(params) {
        return this.client.request("proofs.proof_block_data", params);
      }
      /**
       * Proves that a given block's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function checks block proofs and compares given data with the proven.
       * If the given data differs from the proven, the exception will be thrown.
       * The input param is a single block's JSON object, which was queried from DApp
       * server using functions such as `net.query`, `net.query_collection` or
       * `net.wait_for_collection`. If block's BOC is not provided in the JSON, it
       * will be queried from DApp server (in this case it is required to provide at
       * least `id` of block).
       *
       * Please note, that joins (like `signatures` in `Block`) are separated
       * entities and not supported, so function will throw an exception in a case if
       * JSON being checked has such entities in it.
       *
       * If `cache_in_local_storage` in config is set to `true` (default), downloaded
       * proofs and master-chain BOCs are saved into the persistent local storage
       * (e.g. file system for native environments or browser's IndexedDB for the
       * web); otherwise all the data is cached only in memory in current client's
       * context and will be lost after destruction of the client.
       *
       * **Why Proofs are needed**
       *
       * Proofs are needed to ensure that the data downloaded from a DApp server is
       * real blockchain data. Checking proofs can protect from the malicious DApp
       * server which can potentially provide fake data, or also from "Man in the
       * Middle" attacks class.
       *
       * **What Proofs are**
       *
       * Simply, proof is a list of signatures of validators', which have signed this
       * particular master- block.
       *
       * The very first validator set's public keys are included in the zero-state.
       * Whe know a root hash of the zero-state, because it is stored in the network
       * configuration file, it is our authority root. For proving zero-state it is
       * enough to calculate and compare its root hash.
       *
       * In each new validator cycle the validator set is changed. The new one is
       * stored in a key-block, which is signed by the validator set, which we
       * already trust, the next validator set will be stored to the new key-block
       * and signed by the current validator set, and so on.
       *
       * In order to prove any block in the master-chain we need to check, that it
       * has been signed by a trusted validator set. So we need to check all
       * key-blocks' proofs, started from the zero-state and until the block, which
       * we want to prove. But it can take a lot of time and traffic to download and
       * prove all key-blocks on a client. For solving this, special trusted blocks
       * are used in Ever-SDK.
       *
       * The trusted block is the authority root, as well, as the zero-state. Each
       * trusted block is the `id` (e.g. `root_hash`) of the already proven
       * key-block. There can be plenty of trusted blocks, so there can be a lot of
       * authority roots. The hashes of trusted blocks for MainNet and DevNet are
       * hardcoded in SDK in a separated binary file (trusted_key_blocks.bin) and is
       * being updated for each release by using `update_trusted_blocks` utility.
       *
       * See [update_trusted_blocks](../../../tools/update_trusted_blocks) directory
       * for more info.
       *
       * In future SDK releases, one will also be able to provide their hashes of
       * trusted blocks for other networks, besides for MainNet and DevNet.
       * By using trusted key-blocks, in order to prove any block, we can prove chain
       * of key-blocks to the closest previous trusted key-block, not only to the
       * zero-state.
       *
       * But shard-blocks don't have proofs on DApp server. In this case, in order to
       * prove any shard- block data, we search for a corresponding master-block,
       * which contains the root hash of this shard-block, or some shard block which
       * is linked to that block in shard-chain. After proving this master-block, we
       * traverse through each link and calculate and compare hashes with links,
       * one-by-one. After that we can ensure that this shard-block has also been
       * proven.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfProofBlockData} params
       * @returns
       */
      proof_block_data_sync(params) {
        this.client.requestSync("proofs.proof_block_data", params);
      }
      /**
       * Proves that a given transaction's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function requests the corresponding block, checks block proofs, ensures
       * that given transaction exists in the proven block and compares given data
       * with the proven. If the given data differs from the proven, the exception
       * will be thrown. The input parameter is a single transaction's JSON object
       * (see params description), which was queried from TONOS API using functions
       * such as `net.query`, `net.query_collection` or `net.wait_for_collection`.
       *
       * If transaction's BOC and/or `block_id` are not provided in the JSON, they
       * will be queried from TONOS API.
       *
       * Please note, that joins (like `account`, `in_message`, `out_messages`, etc.
       * in `Transaction` entity) are separated entities and not supported, so
       * function will throw an exception in a case if JSON being checked has such
       * entities in it.
       *
       * For more information about proofs checking, see description of
       * `proof_block_data` function.
       *
       * @param {ParamsOfProofTransactionData} params
       * @returns
       */
      proof_transaction_data(params) {
        return this.client.request("proofs.proof_transaction_data", params);
      }
      /**
       * Proves that a given transaction's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function requests the corresponding block, checks block proofs, ensures
       * that given transaction exists in the proven block and compares given data
       * with the proven. If the given data differs from the proven, the exception
       * will be thrown. The input parameter is a single transaction's JSON object
       * (see params description), which was queried from TONOS API using functions
       * such as `net.query`, `net.query_collection` or `net.wait_for_collection`.
       *
       * If transaction's BOC and/or `block_id` are not provided in the JSON, they
       * will be queried from TONOS API.
       *
       * Please note, that joins (like `account`, `in_message`, `out_messages`, etc.
       * in `Transaction` entity) are separated entities and not supported, so
       * function will throw an exception in a case if JSON being checked has such
       * entities in it.
       *
       * For more information about proofs checking, see description of
       * `proof_block_data` function.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfProofTransactionData} params
       * @returns
       */
      proof_transaction_data_sync(params) {
        this.client.requestSync("proofs.proof_transaction_data", params);
      }
      /**
       * Proves that a given message's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function first proves the corresponding transaction, ensures that the
       * proven transaction refers to the given message and compares given data with
       * the proven. If the given data differs from the proven, the exception will be
       * thrown. The input parameter is a single message's JSON object (see params
       * description), which was queried from TONOS API using functions such as
       * `net.query`, `net.query_collection` or `net.wait_for_collection`.
       *
       * If message's BOC and/or non-null `src_transaction.id` or
       * `dst_transaction.id` are not provided in the JSON, they will be queried from
       * TONOS API.
       *
       * Please note, that joins (like `block`, `dst_account`, `dst_transaction`,
       * `src_account`, `src_transaction`, etc. in `Message` entity) are separated
       * entities and not supported, so function will throw an exception in a case if
       * JSON being checked has such entities in it.
       *
       * For more information about proofs checking, see description of
       * `proof_block_data` function.
       *
       * @param {ParamsOfProofMessageData} params
       * @returns
       */
      proof_message_data(params) {
        return this.client.request("proofs.proof_message_data", params);
      }
      /**
       * Proves that a given message's data, which is queried from TONOS API, can be trusted.
       *
       * @remarks
       * This function first proves the corresponding transaction, ensures that the
       * proven transaction refers to the given message and compares given data with
       * the proven. If the given data differs from the proven, the exception will be
       * thrown. The input parameter is a single message's JSON object (see params
       * description), which was queried from TONOS API using functions such as
       * `net.query`, `net.query_collection` or `net.wait_for_collection`.
       *
       * If message's BOC and/or non-null `src_transaction.id` or
       * `dst_transaction.id` are not provided in the JSON, they will be queried from
       * TONOS API.
       *
       * Please note, that joins (like `block`, `dst_account`, `dst_transaction`,
       * `src_account`, `src_transaction`, etc. in `Message` entity) are separated
       * entities and not supported, so function will throw an exception in a case if
       * JSON being checked has such entities in it.
       *
       * For more information about proofs checking, see description of
       * `proof_block_data` function.
       *
       * NOTE: Available only for `lib-node` binding.
       *
       *
       *
       * @param {ParamsOfProofMessageData} params
       * @returns
       */
      proof_message_data_sync(params) {
        this.client.requestSync("proofs.proof_message_data", params);
      }
    };
    exports.ProofsModule = ProofsModule;
  }
});

// node_modules/@tvmsdk/core/dist/errors.js
var require_errors = __commonJS({
  "node_modules/@tvmsdk/core/dist/errors.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TvmClientError = void 0;
    var TvmClientError = class extends Error {
      constructor(code, message, data) {
        super(message);
        this.code = code;
        this.data = data;
      }
    };
    exports.TvmClientError = TvmClientError;
  }
});

// node_modules/@tvmsdk/core/dist/bin.js
var require_bin = __commonJS({
  "node_modules/@tvmsdk/core/dist/bin.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.BinaryBridge = exports.useLibrary = exports.getBridge = exports.ResponseType = void 0;
    var errors_1 = require_errors();
    var ResponseType;
    (function(ResponseType2) {
      ResponseType2[ResponseType2["Success"] = 0] = "Success";
      ResponseType2[ResponseType2["Error"] = 1] = "Error";
      ResponseType2[ResponseType2["Nop"] = 2] = "Nop";
      ResponseType2[ResponseType2["AppRequest"] = 3] = "AppRequest";
      ResponseType2[ResponseType2["AppNotify"] = 4] = "AppNotify";
      ResponseType2[ResponseType2["Custom"] = 100] = "Custom";
    })(ResponseType = exports.ResponseType || (exports.ResponseType = {}));
    var bridge = void 0;
    function getBridge() {
      if (!bridge) {
        throw new errors_1.TvmClientError(1, "TON Client binary bridge isn't set.");
      }
      return bridge;
    }
    exports.getBridge = getBridge;
    function useLibrary(loader) {
      bridge = new BinaryBridge(loader);
    }
    exports.useLibrary = useLibrary;
    function resolveBinding(library) {
      if ("requestParamsSync" in library) {
        return { syncLibrary: library };
      }
      if ("requestSync" in library) {
        return { syncLibrary: new SyncBinaryLibraryAdapter(library) };
      }
      if ("sendRequestParams" in library) {
        return { library };
      } else {
        return { library: new BinaryLibraryAdapter(library) };
      }
    }
    var BinaryBridge = class _BinaryBridge {
      constructor(loader) {
        this.loading = void 0;
        this.loadError = void 0;
        this.binding = void 0;
        this.requests = /* @__PURE__ */ new Map();
        this.nextRequestId = 1;
        this.contextCount = 0;
        this.responseHandlerAssigned = false;
        const libraryOrPromise = loader();
        if (libraryOrPromise instanceof Promise) {
          this.loading = [];
          libraryOrPromise.then((library) => {
            const saveLoading = this.loading;
            this.loading = void 0;
            const binding = resolveBinding(library);
            this.binding = binding;
            saveLoading === null || saveLoading === void 0 ? void 0 : saveLoading.forEach((x) => x.resolve(binding));
          }, (reason) => {
            const saveLoading = this.loading;
            this.loading = void 0;
            this.loadError = reason !== null && reason !== void 0 ? reason : void 0;
            saveLoading === null || saveLoading === void 0 ? void 0 : saveLoading.forEach((x) => x.reject(reason));
          });
        } else {
          this.binding = resolveBinding(libraryOrPromise);
        }
      }
      checkResponseHandler() {
        var _a, _b;
        const mustBeAssigned = this.contextCount > 0 || this.requests.size > 0;
        if (this.responseHandlerAssigned !== mustBeAssigned) {
          if (this.binding) {
            const { library, syncLibrary } = this.binding;
            if (mustBeAssigned) {
              const handler = (requestId, params, responseType, finished) => this.handleLibraryResponse(requestId, params, responseType, finished);
              (_a = library !== null && library !== void 0 ? library : syncLibrary) === null || _a === void 0 ? void 0 : _a.setResponseParamsHandler(handler);
            } else {
              (_b = library !== null && library !== void 0 ? library : syncLibrary) === null || _b === void 0 ? void 0 : _b.setResponseParamsHandler();
            }
          }
          this.responseHandlerAssigned = mustBeAssigned;
        }
      }
      getLibName() {
        return __awaiter(this, void 0, void 0, function* () {
          const { library, syncLibrary } = yield this.bindingRequired();
          if (syncLibrary) {
            return syncLibrary.getLibName();
          }
          return yield library.getLibName();
        });
      }
      getLibNameSync() {
        return this.syncLibraryRequired().getLibName();
      }
      createContext(config) {
        return __awaiter(this, void 0, void 0, function* () {
          const { library, syncLibrary } = yield this.bindingRequired();
          this.contextCount += 1;
          const configJson = JSON.stringify(config);
          const context = syncLibrary ? syncLibrary.createContext(configJson) : yield library.createContext(configJson);
          return _BinaryBridge.parseResult(context);
        });
      }
      createContextSync(config) {
        const library = this.syncLibraryRequired();
        this.contextCount += 1;
        const configJson = JSON.stringify(config);
        const context = library.createContext(configJson);
        return _BinaryBridge.parseResult(context);
      }
      destroyContext(context) {
        var _a, _b;
        this.contextCount = Math.max(this.contextCount - 1, 0);
        this.checkResponseHandler();
        if (this.binding) {
          (_b = (_a = this.binding.library) !== null && _a !== void 0 ? _a : this.binding.syncLibrary) === null || _b === void 0 ? void 0 : _b.destroyContext(context);
        }
      }
      request(context, functionName, functionParams, responseHandler) {
        return __awaiter(this, void 0, void 0, function* () {
          const { library, syncLibrary } = yield this.bindingRequired();
          return new Promise((resolve, reject) => {
            var _a;
            const request = {
              resolve,
              reject,
              responseHandler
            };
            const requestId = this.generateRequestId();
            this.requests.set(requestId, request);
            this.checkResponseHandler();
            (_a = library !== null && library !== void 0 ? library : syncLibrary) === null || _a === void 0 ? void 0 : _a.sendRequestParams(context, requestId, functionName, functionParams);
          });
        });
      }
      requestSync(context, functionName, functionParams) {
        const library = this.syncLibraryRequired();
        return _BinaryBridge.parseResultParams(library.requestParamsSync(context, functionName, functionParams));
      }
      bindingRequired() {
        if (this.binding) {
          return Promise.resolve(this.binding);
        }
        if (this.loadError) {
          return Promise.reject(this.loadError);
        }
        if (this.loading === void 0) {
          return Promise.reject(new errors_1.TvmClientError(1, "TON Client binary library isn't set."));
        }
        return new Promise((resolve, reject) => {
          var _a;
          (_a = this.loading) === null || _a === void 0 ? void 0 : _a.push({
            resolve,
            reject
          });
        });
      }
      syncLibraryRequired() {
        var _a;
        const library = (_a = this.binding) === null || _a === void 0 ? void 0 : _a.syncLibrary;
        if (library) {
          return library;
        }
        throw new errors_1.TvmClientError(1, "TON Client binary library does not support sync calls.");
      }
      generateRequestId() {
        const id = this.nextRequestId;
        do {
          this.nextRequestId += 1;
          if (this.nextRequestId >= Number.MAX_SAFE_INTEGER) {
            this.nextRequestId = 1;
          }
        } while (this.requests.has(this.nextRequestId));
        return id;
      }
      handleLibraryResponse(requestId, params, responseType, finished) {
        const request = this.requests.get(requestId);
        if (!request) {
          return;
        }
        if (finished) {
          this.requests.delete(requestId);
          this.checkResponseHandler();
        }
        switch (responseType) {
          case ResponseType.Success:
            request.resolve(params);
            break;
          case ResponseType.Error:
            request.reject(params);
            break;
          default:
            const isAppObjectOrCustom = responseType === ResponseType.AppNotify || responseType === ResponseType.AppRequest || responseType >= ResponseType.Custom;
            if (isAppObjectOrCustom && request.responseHandler) {
              request.responseHandler(params, responseType);
            }
        }
      }
      static parseResult(resultJson) {
        if (resultJson === void 0) {
          return void 0;
        }
        return _BinaryBridge.parseResultParams(JSON.parse(resultJson));
      }
      static parseResultParams(result) {
        if (result === void 0) {
          return void 0;
        }
        if ("error" in result) {
          throw new errors_1.TvmClientError(result.error.code, result.error.message, result.error.data);
        }
        return result.result;
      }
    };
    exports.BinaryBridge = BinaryBridge;
    var BinaryLibraryAdapter = class {
      constructor(library) {
        this.library = library;
      }
      getLibName() {
        return this.library.getLibName();
      }
      createContext(configJson) {
        return this.library.createContext(configJson);
      }
      destroyContext(context) {
        this.library.destroyContext(context);
      }
      setResponseParamsHandler(handler) {
        if (handler === void 0) {
          this.library.setResponseHandler(void 0);
        } else {
          this.library.setResponseHandler(responseParamsAdapter(handler));
        }
      }
      sendRequestParams(context, requestId, functionName, functionParams) {
        this.library.sendRequest(context, requestId, functionName, toJson(functionParams));
      }
    };
    var SyncBinaryLibraryAdapter = class {
      constructor(library) {
        this.library = library;
      }
      getLibName() {
        return this.library.getLibName();
      }
      createContext(configJson) {
        return this.library.createContext(configJson);
      }
      destroyContext(context) {
        this.library.destroyContext(context);
      }
      setResponseParamsHandler(handler) {
        if (handler === void 0) {
          this.library.setResponseHandler(void 0);
        } else {
          this.library.setResponseHandler(responseParamsAdapter(handler));
        }
      }
      sendRequestParams(context, requestId, functionName, functionParams) {
        this.library.sendRequest(context, requestId, functionName, toJson(functionParams));
      }
      requestParamsSync(context, functionName, functionParams) {
        return parseJson(this.library.requestSync(context, functionName, toJson(functionParams)));
      }
    };
    function responseParamsAdapter(handler) {
      return (requestId, paramsJson, responseType, finished) => handler(requestId, parseJson(paramsJson), responseType, finished);
    }
    function parseJson(json) {
      return json !== "" ? JSON.parse(json) : void 0;
    }
    function toJson(params) {
      return params === void 0 || params === null ? "" : JSON.stringify(params, (_, value) => typeof value === "bigint" ? value < Number.MAX_SAFE_INTEGER && value > Number.MIN_SAFE_INTEGER ? Number(value) : value.toString() : value);
    }
  }
});

// node_modules/@tvmsdk/core/dist/version.js
var require_version = __commonJS({
  "node_modules/@tvmsdk/core/dist/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.packageVersion = void 0;
    exports.packageVersion = "2.2.0";
  }
});

// node_modules/@tvmsdk/core/dist/client.js
var require_client = __commonJS({
  "node_modules/@tvmsdk/core/dist/client.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      function adopt(value) {
        return value instanceof P ? value : new P(function(resolve) {
          resolve(value);
        });
      }
      return new (P || (P = Promise))(function(resolve, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.TvmClient = void 0;
    var modules_1 = require_modules();
    var bin_1 = require_bin();
    var version_1 = require_version();
    var TvmClient2 = class _TvmClient {
      constructor(config) {
        this.context = void 0;
        this.contextCreation = void 0;
        this.contextError = void 0;
        this.config = config !== null && config !== void 0 ? config : {};
        this.client = new modules_1.ClientModule(this);
        this.crypto = new modules_1.CryptoModule(this);
        this.abi = new modules_1.AbiModule(this);
        this.account = new modules_1.AccountModule(this);
        this.boc = new modules_1.BocModule(this);
        this.processing = new modules_1.ProcessingModule(this);
        this.utils = new modules_1.UtilsModule(this);
        this.net = new modules_1.NetModule(this);
        this.tvm = new modules_1.TvmModule(this);
        this.proofs = new modules_1.ProofsModule(this);
      }
      static set default(client2) {
        this._default = client2;
      }
      static get default() {
        if (this._default === null) {
          this._default = new _TvmClient(this._defaultConfig);
        }
        return this._default;
      }
      static set defaultConfig(config) {
        this._defaultConfig = config;
      }
      static get defaultConfig() {
        return this._defaultConfig;
      }
      static useBinaryLibrary(loader) {
        (0, bin_1.useLibrary)(loader);
      }
      static toKey(d) {
        return toHex(d, 256);
      }
      static toHash64(d) {
        return toHex(d, 64);
      }
      static toHash128(d) {
        return toHex(d, 128);
      }
      static toHash256(d) {
        return toHex(d, 256);
      }
      static toHash512(d) {
        return toHex(d, 512);
      }
      static toHex(dec, bits = 0) {
        return toHex(dec, bits);
      }
      close() {
        const context = this.context;
        if (context !== void 0) {
          this.context = void 0;
          (0, bin_1.getBridge)().destroyContext(context);
        }
      }
      resolveError(functionName, params, err) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
          if (err.code !== 23 || !((_a = err.data) === null || _a === void 0 ? void 0 : _a.suggest_use_helper_for)) {
            return err;
          }
          return this.resolveApiError((yield this.client.get_api_reference()).api, functionName, params, err);
        });
      }
      resolveErrorSync(functionName, params, err) {
        var _a;
        if (err.code !== 23 || !((_a = err.data) === null || _a === void 0 ? void 0 : _a.suggest_use_helper_for)) {
          return err;
        }
        return this.resolveApiError(this.client.get_api_reference_sync().api, functionName, params, err);
      }
      resolveApiError(api, functionName, params, err) {
        var _a, _b;
        if (err.code !== 23 || !((_a = err.data) === null || _a === void 0 ? void 0 : _a.suggest_use_helper_for)) {
          return err;
        }
        try {
          let walkParameters = function(valueTypeInfo, value, path) {
            switch (valueTypeInfo.type) {
              case "Array":
                if (Array.isArray(value)) {
                  value.forEach((v) => walkParameters(valueTypeInfo.array_item, v, `${path}[i]`));
                }
                break;
              case "Struct":
                valueTypeInfo.struct_fields.forEach((sf) => walkParameters(sf, value[sf.name], path ? `${path}.${sf.name}` : sf.name));
                break;
              case "Optional":
                if (value) {
                  walkParameters(valueTypeInfo.optional_inner, value, path);
                }
                break;
              case "Ref":
                if (valueTypeInfo.ref_name != "Value" && valueTypeInfo.ref_name != "API" && valueTypeInfo.ref_name != "AbiParam") {
                  walkParameters(allTypesDict[valueTypeInfo.ref_name], value, path);
                }
                break;
              case "EnumOfTypes":
                if (valueTypeInfo.enum_types.some((et) => et.name == value.type)) {
                  return;
                }
                let parameterName = valueTypeInfo.name.toLowerCase();
                let helperFunctions = [];
                valueTypeInfo.enum_types.forEach((et) => helperFunctions.push(parameterName + et.name));
                err.message = `Consider using one of the helper methods (${helperFunctions.join(", ")}) for the "${path}" parameter
` + err.message;
                break;
              default:
                break;
            }
          };
          const [modName, funcName] = functionName.split(".");
          const allTypesArray = api.modules.reduce((accumulator, element) => accumulator.concat(element.types), []);
          const allTypesDict = {};
          allTypesArray.forEach((element) => allTypesDict[element.name] = element);
          const module3 = api.modules.find((x) => x.name === modName);
          const func = module3.functions.find((x) => x.name === funcName);
          const param = func.params[1];
          if (!param || param.generic_name == "AppObject") {
            return err;
          }
          const paramTypeInfo = allTypesDict[param.ref_name];
          walkParameters(paramTypeInfo, params, "");
        } catch (e) {
          err.message = (_b = e.message) !== null && _b !== void 0 ? _b : `${e}`;
        }
        return err;
      }
      getClientConfig(libName) {
        return Object.assign(Object.assign({}, this.config), { binding: {
          library: `ever-sdk-js (${libName})`,
          version: version_1.packageVersion
        } });
      }
      contextRequiredSync() {
        if (this.context !== void 0) {
          return this.context;
        }
        const bridge = (0, bin_1.getBridge)();
        this.context = bridge.createContextSync(this.getClientConfig(bridge.getLibNameSync()));
        return this.context;
      }
      contextRequired() {
        if (this.context !== void 0) {
          return Promise.resolve(this.context);
        }
        if (this.contextError !== void 0) {
          return Promise.reject(this.contextError);
        }
        if (this.contextCreation === void 0) {
          this.contextCreation = [];
          const bridge = (0, bin_1.getBridge)();
          (() => __awaiter(this, void 0, void 0, function* () {
            try {
              const config = this.getClientConfig(yield bridge.getLibName());
              const context = yield bridge.createContext(config);
              const creation = this.contextCreation;
              this.contextCreation = void 0;
              this.context = context;
              creation === null || creation === void 0 ? void 0 : creation.forEach((x) => x.resolve(context));
            } catch (err) {
              const creation = this.contextCreation;
              this.contextCreation = void 0;
              this.contextError = err !== null && err !== void 0 ? err : void 0;
              creation === null || creation === void 0 ? void 0 : creation.forEach((x) => x.reject(err));
            }
          }))();
        }
        return new Promise((resolve, reject) => {
          var _a;
          (_a = this.contextCreation) === null || _a === void 0 ? void 0 : _a.push({
            resolve,
            reject
          });
        });
      }
      request(functionName, functionParams, responseHandler) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
          const context = (_a = this.context) !== null && _a !== void 0 ? _a : yield this.contextRequired();
          return (0, bin_1.getBridge)().request(context, functionName, functionParams, responseHandler !== null && responseHandler !== void 0 ? responseHandler : (() => {
          })).catch((reason) => __awaiter(this, void 0, void 0, function* () {
            throw yield this.resolveError(functionName, functionParams, reason);
          }));
        });
      }
      requestSync(functionName, functionParams) {
        var _a;
        const context = (_a = this.context) !== null && _a !== void 0 ? _a : this.contextRequiredSync();
        const bridge = (0, bin_1.getBridge)();
        try {
          return bridge.requestSync(context, functionName, functionParams);
        } catch (err) {
          throw this.resolveErrorSync(functionName, functionParams, err);
        }
      }
      resolve_app_request(app_request_id, result) {
        return __awaiter(this, void 0, void 0, function* () {
          if (app_request_id) {
            yield this.client.resolve_app_request({
              app_request_id,
              result: {
                type: "Ok",
                result
              }
            });
          }
        });
      }
      reject_app_request(app_request_id, error) {
        return __awaiter(this, void 0, void 0, function* () {
          if (app_request_id) {
            yield this.client.resolve_app_request({
              app_request_id,
              result: {
                type: "Error",
                text: error.message
              }
            });
          }
        });
      }
    };
    exports.TvmClient = TvmClient2;
    TvmClient2._defaultConfig = {};
    TvmClient2._default = null;
    function toHex(value, bits) {
      let hex;
      if (typeof value === "number" || typeof value === "bigint") {
        hex = value.toString(16);
      } else if (typeof value === "string") {
        if (value.startsWith("0x")) {
          hex = value.substring(2);
        } else {
          hex = decToHex(value);
        }
      } else {
        hex = value.toString();
      }
      let len = bits / 4;
      while (hex.length > len && hex.startsWith("0")) {
        hex = hex.substring(1);
      }
      return hex.padStart(len, "0");
    }
    function decToHex(dec) {
      var _a;
      let bigNum = [];
      for (let i = 0; i < dec.length; i += 1) {
        const d = ((_a = dec.codePointAt(i)) !== null && _a !== void 0 ? _a : 0) - 48;
        const mul8 = shl(bigNum, 3);
        const mul2 = shl(bigNum, 1);
        const mul10 = add(mul8, mul2);
        bigNum = add(mul10, [d]);
      }
      let hex = "";
      for (let i = bigNum.length - 1; i >= 0; i -= 1) {
        hex += bigNum[i].toString(16).padStart(4, "0");
      }
      return hex;
    }
    function shl(bigNum, bits) {
      let rest = 0;
      const result = [];
      for (let i = 0; i < bigNum.length; i += 1) {
        let v = (bigNum[i] << bits) + rest;
        result.push(v & 65535);
        rest = v >> 16 & 65535;
      }
      if (rest > 0) {
        result.push(rest);
      }
      return result;
    }
    function add(a, b) {
      let rest = 0;
      const result = [];
      const len = Math.max(a.length, b.length);
      for (let i = 0; i < len; i += 1) {
        let v = (i < a.length ? a[i] : 0) + (i < b.length ? b[i] : 0) + rest;
        result.push(v & 65535);
        rest = v >> 16 & 65535;
      }
      if (rest > 0) {
        result.push(rest);
      }
      return result;
    }
  }
});

// node_modules/@tvmsdk/core/dist/index.js
var require_dist = __commonJS({
  "node_modules/@tvmsdk/core/dist/index.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __exportStar = exports && exports.__exportStar || function(m, exports2) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p)) __createBinding(exports2, m, p);
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    __exportStar(require_modules(), exports);
    __exportStar(require_client(), exports);
  }
});

// src/offscreen.js
var import_core = __toESM(require_dist(), 1);

// wasm/libweb-wrapper.mjs
var workerScript = `//****************************************************************** WRAPPER BEGIN
let wasm;

const heap = new Array(128).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

const cachedTextDecoder = (typeof TextDecoder !== 'undefined' ? new TextDecoder('utf-8', { ignoreBOM: true, fatal: true }) : { decode: () => { throw Error('TextDecoder not available') } } );

if (typeof TextDecoder !== 'undefined') { cachedTextDecoder.decode(); };

let cachedUint8Memory0 = null;

function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
        cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

let WASM_VECTOR_LEN = 0;

const cachedTextEncoder = (typeof TextEncoder !== 'undefined' ? new TextEncoder('utf-8') : { encode: () => { throw Error('TextEncoder not available') } } );

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachedInt32Memory0 = null;

function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
        cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
}

let cachedFloat64Memory0 = null;

function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
        cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
}

let cachedBigInt64Memory0 = null;

function getBigInt64Memory0() {
    if (cachedBigInt64Memory0 === null || cachedBigInt64Memory0.byteLength === 0) {
        cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer);
    }
    return cachedBigInt64Memory0;
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  \`\${val}\`;
    }
    if (type == 'string') {
        return \`"\${val}"\`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return \`Symbol(\${description})\`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return \`Function(\${name})\`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\\[object ([^\\]]+)\\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of \`val\`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return \`\${val.name}: \${val.message}\\n\${val.stack}\`;
    }
    // TODO we could test for more things here, like \`Set\`s and \`Map\`s.
    return className;
}

const CLOSURE_DTORS = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(state => {
    wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b)
});

function makeClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        try {
            return f(state.a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b);
                state.a = 0;
                CLOSURE_DTORS.unregister(state);
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}
function __wbg_adapter_50(arg0, arg1) {
    wasm._dyn_core__ops__function__Fn_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h3a38eba89bd7eee2(arg0, arg1);
}

function __wbg_adapter_53(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__Fn__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h6db2f9b419caf886(arg0, arg1, addHeapObject(arg2));
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
                CLOSURE_DTORS.unregister(state);
            } else {
                state.a = a;
            }
        }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
}
function __wbg_adapter_56(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__haa1a6f11fd24dced(arg0, arg1);
}

function __wbg_adapter_59(arg0, arg1, arg2) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h544c00ee3e7cec57(retptr, arg0, arg1, addHeapObject(arg2));
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wbg_adapter_62(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1a986fe75f20092b(arg0, arg1, addHeapObject(arg2));
}

/**
* @param {string} config_json
* @returns {string}
*/
function core_create_context(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.core_create_context(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        deferred2_0 = r0;
        deferred2_1 = r1;
        return getStringFromWasm0(r0, r1);
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
        wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
}

/**
* @param {number} context
* @param {string} function_name
* @param {any} params
* @param {number} request_id
*/
function core_request(context, function_name, params, request_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(function_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.core_request(retptr, context, ptr0, len0, addHeapObject(params), request_id);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

/**
* @param {number} context
*/
function core_destroy_context(context) {
    wasm.core_destroy_context(context);
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("\`WebAssembly.instantiateStreaming\` failed because your server does not serve wasm with \`application/wasm\` MIME type. Falling back to \`WebAssembly.instantiate\` which is slower. Original error:\\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_28c511d9baebfa89 = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
        const ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        const ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_String_63b60bf2d0a90959 = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_message_5bf28016c2b49cfb = function(arg0) {
        const ret = getObject(arg0).message;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_coreresponsehandler_20bcf2bc15d3b9a9 = function(arg0, arg1, arg2, arg3) {
        core_response_handler(arg0 >>> 0, takeObject(arg1), arg2 >>> 0, arg3 !== 0);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'string' ? obj : undefined;
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        const ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
        const ret = getObject(arg0) === null;
        return ret;
    };
    imports.wbg.__wbg_String_b9412f8799faab3e = function(arg0, arg1) {
        const ret = String(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
        const ret = new Date();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTime_2bc4375165f02d15 = function(arg0) {
        const ret = getObject(arg0).getTime();
        return ret;
    };
    imports.wbg.__wbg_crypto_8f90fdde9566e2ad = function(arg0) {
        const ret = getObject(arg0).crypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
        const val = getObject(arg0);
        const ret = typeof(val) === 'object' && val !== null;
        return ret;
    };
    imports.wbg.__wbg_process_8eb2777bc1b6b0fa = function(arg0) {
        const ret = getObject(arg0).process;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_50a627196d924b94 = function(arg0) {
        const ret = getObject(arg0).versions;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_fe444c3146177840 = function(arg0) {
        const ret = getObject(arg0).node;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'string';
        return ret;
    };
    imports.wbg.__wbg_require_118cb4d5bf61ca1d = function() { return handleError(function () {
        const ret = module.require;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_is_function = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'function';
        return ret;
    };
    imports.wbg.__wbg_call_b3ca7c6051f9bec1 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_msCrypto_31602000d4eb6ef9 = function(arg0) {
        const ret = getObject(arg0).msCrypto;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(arg0) {
        const ret = new Uint8Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_transaction_1e282a79e9bb7387 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).transaction(getStringFromWasm0(arg1, arg2), takeObject(arg3));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setoncomplete_d8e4236665cbf1e2 = function(arg0, arg1) {
        getObject(arg0).oncomplete = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_da071ec94e148397 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_setonabort_523135fd9168ae8b = function(arg0, arg1) {
        getObject(arg0).onabort = getObject(arg1);
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        const ret = false;
        return ret;
    };
    imports.wbg.__wbg_target_2fc177e386c8b7b0 = function(arg0) {
        const ret = getObject(arg0).target;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        const ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_readyState_f8d58cc9e9c4f906 = function(arg0) {
        const ret = getObject(arg0).readyState;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_setonsuccess_632ce0a1460455c2 = function(arg0, arg1) {
        getObject(arg0).onsuccess = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_8479b33e7568a904 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_objectStore_da468793bd9df17b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).objectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_memory = function() {
        const ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_12d079cc21e14bdb = function(arg0) {
        const ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_63b92bc8671ed464 = function(arg0) {
        const ret = new Uint8Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_a47bac70306a19a7 = function(arg0, arg1, arg2) {
        getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_length_c20a40f15020d68a = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_call_27c0f87801dedf93 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
        const ret = Symbol.iterator;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_40fc327bfc8770e6 = function(arg0) {
        const ret = getObject(arg0).next;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_196c84450b364254 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_done_298b57d23c0fc80c = function(arg0) {
        const ret = getObject(arg0).done;
        return ret;
    };
    imports.wbg.__wbg_value_d93c65011f51a456 = function(arg0) {
        const ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_bd8e338fbd5f5cc8 = function(arg0, arg1) {
        const ret = getObject(arg0)[arg1 >>> 0];
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_e3c254076557e348 = function() { return handleError(function (arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_set_1f9b04f170055d33 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    }, arguments) };
    imports.wbg.__wbg_self_ce0dbfc45cf2f5be = function() { return handleError(function () {
        const ret = self.self;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_window_c6fb939a7f436783 = function() { return handleError(function () {
        const ret = window.window;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_globalThis_d1e6af4856ba331b = function() { return handleError(function () {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_207b558942527489 = function() { return handleError(function () {
        const ret = global.global;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(arg0, arg1) {
        const ret = new Function(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(arg0, arg1, arg2) {
        const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_bf004fc1e39ad54a = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getRandomValues_47a210009a601d67 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
        const ret = new Error(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
        const ret = getObject(arg0) == getObject(arg1);
        return ret;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
        const v = getObject(arg0);
        const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
        return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
        const obj = getObject(arg1);
        const ret = typeof(obj) === 'number' ? obj : undefined;
        getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbg_instanceof_Uint8Array_2b3bbecd033d19f6 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Uint8Array;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_836825be07d4c9d2 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof ArrayBuffer;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_instanceof_Error_e20bb56fd5591a93 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Error;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_stringify_8887fe74e1c50d81 = function() { return handleError(function (arg0) {
        const ret = JSON.stringify(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setTimeout_c172d5704ef82276 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
        return ret;
    }, arguments) };
    imports.wbg.__wbg_clearTimeout_ba63ae54a36e111e = function(arg0, arg1) {
        getObject(arg0).clearTimeout(arg1);
    };
    imports.wbg.__wbg_headers_abb199c3be8d817c = function(arg0) {
        const ret = getObject(arg0).headers;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_cb0e7a5c2dd66afd = function() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    }, arguments) };
    imports.wbg.__wbg_fetch_c4b6afebdb1f918e = function(arg0, arg1) {
        const ret = getObject(arg0).fetch(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Response_849eb93e75734b6e = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Response;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_status_61a01141acd3cf74 = function(arg0) {
        const ret = getObject(arg0).status;
        return ret;
    };
    imports.wbg.__wbg_url_5f6dc4009ac5f99d = function(arg0, arg1) {
        const ret = getObject(arg1).url;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_message_c539585471131985 = function(arg0, arg1) {
        const ret = getObject(arg1).message;
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_put_22792e17580ca18b = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).put(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setonupgradeneeded_ad7645373c7d5e1b = function(arg0, arg1) {
        getObject(arg0).onupgradeneeded = getObject(arg1);
    };
    imports.wbg.__wbg_setonblocked_eb1032a3dfaabd1c = function(arg0, arg1) {
        getObject(arg0).onblocked = getObject(arg1);
    };
    imports.wbg.__wbg_setonversionchange_af0457acbb949df2 = function(arg0, arg1) {
        getObject(arg0).onversionchange = getObject(arg1);
    };
    imports.wbg.__wbg_Window_18c70cd8aae46148 = function(arg0) {
        const ret = getObject(arg0).Window;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_7c51d9056667f4e0 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_WorkerGlobalScope_e05a65389c91124f = function(arg0) {
        const ret = getObject(arg0).WorkerGlobalScope;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_d312f95759a15fdc = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_global_43fcc492dd43a370 = function(arg0) {
        const ret = getObject(arg0).global;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_dc5bedbc95106b81 = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_open_a05198d687357536 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_get_5361b64cac0d0826 = function() { return handleError(function (arg0, arg1) {
        const ret = getObject(arg0).get(getObject(arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_6c74223c77cfabad = function() { return handleError(function (arg0, arg1) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithstr_31798037aa20dbc1 = function() { return handleError(function (arg0, arg1, arg2, arg3) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_setonmessage_2af154ce83a3dc94 = function(arg0, arg1) {
        getObject(arg0).onmessage = getObject(arg1);
    };
    imports.wbg.__wbg_setonopen_ce7a4c51e5cf5788 = function(arg0, arg1) {
        getObject(arg0).onopen = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_39a785302b0cd2e9 = function(arg0, arg1) {
        getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_close_acd9532ff5c093ea = function() { return handleError(function (arg0) {
        getObject(arg0).close();
    }, arguments) };
    imports.wbg.__wbg_send_70603dff16b81b66 = function() { return handleError(function (arg0, arg1, arg2) {
        getObject(arg0).send(getStringFromWasm0(arg1, arg2));
    }, arguments) };
    imports.wbg.__wbg_data_3ce7c145ca4fbcdc = function(arg0) {
        const ret = getObject(arg0).data;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_objectStoreNames_588b5924274239fd = function(arg0) {
        const ret = getObject(arg0).objectStoreNames;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_item_87130eb4d38ecdc5 = function(arg0, arg1, arg2) {
        const ret = getObject(arg1).item(arg2 >>> 0);
        var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_createObjectStore_882f2f6b1b1ef040 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = getObject(arg0).createObjectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_cf3ec55744a78578 = function(arg0) {
        const ret = new Date(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTimezoneOffset_38257122e236c190 = function(arg0) {
        const ret = getObject(arg0).getTimezoneOffset();
        return ret;
    };
    imports.wbg.__wbg_newwithlength_66ae46612e7f0234 = function(arg0) {
        const ret = new Array(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_d4638f722068f043 = function(arg0, arg1, arg2) {
        getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_newwithu8arraysequence_9d62f79f4425e877 = function() { return handleError(function (arg0) {
        const ret = new Blob(getObject(arg0));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_keys_91e412b4b222659f = function(arg0) {
        const ret = Object.keys(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_cd7af8117672b8b8 = function(arg0) {
        const ret = getObject(arg0).length;
        return ret;
    };
    imports.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
        const ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_d9bc3a0147634640 = function() {
        const ret = new Map();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_8417257aaedc936b = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_6648ce0320163d0f = function(arg0, arg1, arg2) {
        getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
        const ret = typeof(getObject(arg0)) === 'bigint';
        return ret;
    };
    imports.wbg.__wbg_isSafeInteger_f7b04ef02296c4d2 = function(arg0) {
        const ret = Number.isSafeInteger(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
        const v = getObject(arg1);
        const ret = typeof(v) === 'bigint' ? v : undefined;
        getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret;
        getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
        const ret = arg0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
        const ret = getObject(arg0) === getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg_isArray_2ab64d95e09ea0ae = function(arg0) {
        const ret = Array.isArray(getObject(arg0));
        return ret;
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
        const ret = getObject(arg0) in getObject(arg1);
        return ret;
    };
    imports.wbg.__wbg_instanceof_Map_87917e0a7aaf4012 = function(arg0) {
        let result;
        try {
            result = getObject(arg0) instanceof Map;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
        const ret = BigInt.asUintN(64, arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_entries_95cc2c823b285a09 = function(arg0) {
        const ret = Object.entries(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
        const ret = debugString(getObject(arg1));
        const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len1 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len1;
        getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(arg0, arg1) {
        const ret = getObject(arg0).then(getObject(arg1));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(arg0) {
        queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(arg0) {
        const ret = getObject(arg0).queueMicrotask;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_resolve_b0083a7967828ec8 = function(arg0) {
        const ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_a73caa9a87991566 = function(arg0, arg1, arg2) {
        const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Window_f401953a2cf86220 = function(arg0) {
        let result;
        try {
            result = true;
        } catch (_) {
            result = false;
        }
        const ret = result;
        return ret;
    };
    imports.wbg.__wbg_text_450a059667fd91fd = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).text();
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_error_685b20024dc2d6ca = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).error;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_result_6cedf5f78600a79c = function() { return handleError(function (arg0) {
        const ret = getObject(arg0).result;
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() { return handleError(function (arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbindgen_closure_wrapper777 = function(arg0, arg1, arg2) {
        const ret = makeClosure(arg0, arg1, 81, __wbg_adapter_50);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper780 = function(arg0, arg1, arg2) {
        const ret = makeClosure(arg0, arg1, 81, __wbg_adapter_53);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper3746 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 480, __wbg_adapter_56);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper4468 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_59);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5747 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_62);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5749 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 1324, __wbg_adapter_62);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5750 = function(arg0, arg1, arg2) {
        const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_62);
        return addHeapObject(ret);
    };

    return imports;
}

function __wbg_init_memory(imports, maybe_memory) {

}

function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    cachedBigInt64Memory0 = null;
    cachedFloat64Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint8Memory0 = null;


    return wasm;
}

function initSync(module) {
    if (wasm !== undefined) return wasm;

    const imports = __wbg_get_imports();

    __wbg_init_memory(imports);

    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }

    const instance = new WebAssembly.Instance(module, imports);

    return __wbg_finalize_init(instance, module);
}

async function init(input) {
    if (wasm !== undefined) return wasm;

    if (typeof input === 'undefined') {    }
    const imports = __wbg_get_imports();

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    __wbg_init_memory(imports);

    const { instance, module } = await __wbg_load(await input, imports);

    return __wbg_finalize_init(instance, module);
}


//****************************************************************** WRAPPER END

function replaceUndefinedWithNulls(value) {
    if (value === undefined) {
        return null;
    }
    if (value instanceof Blob) {
        return value;
    }
    if (typeof value === "object" && value !== null) {
        const result = Array.isArray(value) ? [] : {};
        for (const key in value) {
            result[key] = replaceUndefinedWithNulls(value[key]);
        }
        return result;
    }
    return value;
};

function core_response_handler(request_id, params, response_type, finished) {
    postMessage({
        type: 'response',
        requestId: request_id,
        params: replaceUndefinedWithNulls(params),
        responseType: response_type,
        finished,
    });
}

async function replaceBlobsWithArrayBuffers(value) {
    if (value instanceof Blob) {
        return await value.arrayBuffer();
    }
    if (typeof value === "bigint") {
        if (value < Number.MAX_SAFE_INTEGER && value > Number.MIN_SAFE_INTEGER) {
            return Number(value);
        } else {
            return value.toString();
        }
    }
    if (typeof value === "object" && value !== null) {
        const result = Array.isArray(value) ? [] : {};
        for (const key in value) {
            result[key] = await replaceBlobsWithArrayBuffers(value[key]);
        }
        return result;
    }
    return value;
}

self.onmessage = (e) => {
    const message = e.data;
    switch (message.type) {
    case 'init':
        (async () => {
            await init(message.wasmModule);
            postMessage({ type: 'init' });
        })();
        break;

    case 'createContext':
        postMessage({
            type: 'createContext',
            result: core_create_context(message.configJson),
            requestId: message.requestId,
        });
        break;

    case 'destroyContext':
        core_destroy_context(message.context);
        postMessage({
            type: 'destroyContext'
        });
        break;

    case 'request':
        (async () => {
            core_request(
                message.context,
                message.functionName,
                await replaceBlobsWithArrayBuffers(message.functionParams),
                message.requestId,
            );
        })();
        break;
    }
};
`;
var options = null;
function libWebSetup(libOptions) {
  options = libOptions;
}
function getLibName() {
  return Promise.resolve("web");
}
function debugLog(message) {
  if (options && options.debugLog) {
    options.debugLog(message);
  }
}
async function loadModule() {
  const startLoadTime = Date.now();
  let wasmModule;
  if (options && options.loadModule) {
    wasmModule = await options.loadModule;
  } else {
    const fetched = fetch(options && options.binaryURL || "/eversdk.wasm");
    if (WebAssembly.compileStreaming) {
      debugLog("compileStreaming binary");
      return await WebAssembly.compileStreaming(fetched);
    }
    debugLog("compile binary");
    wasmModule = await WebAssembly.compile(await (await fetched).arrayBuffer());
  }
  await init(wasmModule);
  debugLog(`compile time ${Date.now() - startLoadTime}`);
}
function withSeparateWorker() {
  function debugLog2(message) {
    if (options && options.debugLog) {
      options.debugLog(message);
    }
  }
  const workerBlob = new Blob(
    [workerScript],
    { type: "application/javascript" }
  );
  const workerUrl = URL.createObjectURL(workerBlob);
  const worker = new Worker(workerUrl);
  let nextCreateContextRequestId = 1;
  const createContextRequests = /* @__PURE__ */ new Map();
  let initComplete = false;
  let responseHandler = null;
  worker.onmessage = (evt) => {
    const message = evt.data;
    switch (message.type) {
      case "init":
        initComplete = true;
        for (const [requestId, request2] of createContextRequests.entries()) {
          worker.postMessage({
            type: "createContext",
            requestId,
            configJson: request2.configJson
          });
        }
        break;
      case "createContext":
        const request = createContextRequests.get(message.requestId);
        if (request) {
          createContextRequests.delete(message.requestId);
          request.resolve(message.result);
        }
        break;
      case "destroyContext":
        break;
      case "response":
        if (responseHandler) {
          responseHandler(
            message.requestId,
            message.params,
            message.responseType,
            message.finished
          );
        }
        break;
    }
  };
  worker.onerror = (evt) => {
    console.log(`Error from Web Worker: ${evt.message}`);
  };
  (async () => {
    worker.postMessage({
      type: "init",
      wasmModule: await loadModule()
    });
  })();
  return Promise.resolve({
    getLibName,
    setResponseParamsHandler: (handler) => {
      responseHandler = handler;
    },
    createContext: (configJson) => {
      return new Promise((resolve) => {
        const requestId = nextCreateContextRequestId;
        nextCreateContextRequestId += 1;
        createContextRequests.set(requestId, {
          configJson,
          resolve
        });
        if (initComplete) {
          worker.postMessage({
            type: "createContext",
            requestId,
            configJson
          });
        }
      });
    },
    destroyContext: (context) => {
      worker.postMessage({
        type: "destroyContext",
        context
      });
    },
    sendRequestParams: (context, requestId, functionName, functionParams) => {
      worker.postMessage({
        type: "request",
        context,
        requestId,
        functionName,
        functionParams
      });
    }
  });
}
function withoutSeparateWorker() {
  let wasm;
  const heap = new Array(128).fill(void 0);
  heap.push(void 0, null, true, false);
  function getObject(idx) {
    return heap[idx];
  }
  let heap_next = heap.length;
  function dropObject(idx) {
    if (idx < 132) return;
    heap[idx] = heap_next;
    heap_next = idx;
  }
  function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
  }
  const cachedTextDecoder = typeof TextDecoder !== "undefined" ? new TextDecoder("utf-8", { ignoreBOM: true, fatal: true }) : { decode: () => {
    throw Error("TextDecoder not available");
  } };
  if (typeof TextDecoder !== "undefined") {
    cachedTextDecoder.decode();
  }
  ;
  let cachedUint8Memory0 = null;
  function getUint8Memory0() {
    if (cachedUint8Memory0 === null || cachedUint8Memory0.byteLength === 0) {
      cachedUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8Memory0;
  }
  function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
  }
  function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];
    heap[idx] = obj;
    return idx;
  }
  let WASM_VECTOR_LEN = 0;
  const cachedTextEncoder = typeof TextEncoder !== "undefined" ? new TextEncoder("utf-8") : { encode: () => {
    throw Error("TextEncoder not available");
  } };
  const encodeString = typeof cachedTextEncoder.encodeInto === "function" ? function(arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
  } : function(arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
      read: arg.length,
      written: buf.length
    };
  };
  function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === void 0) {
      const buf = cachedTextEncoder.encode(arg);
      const ptr2 = malloc(buf.length, 1) >>> 0;
      getUint8Memory0().subarray(ptr2, ptr2 + buf.length).set(buf);
      WASM_VECTOR_LEN = buf.length;
      return ptr2;
    }
    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;
    const mem = getUint8Memory0();
    let offset = 0;
    for (; offset < len; offset++) {
      const code = arg.charCodeAt(offset);
      if (code > 127) break;
      mem[ptr + offset] = code;
    }
    if (offset !== len) {
      if (offset !== 0) {
        arg = arg.slice(offset);
      }
      ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
      const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
      const ret = encodeString(arg, view);
      offset += ret.written;
      ptr = realloc(ptr, len, offset, 1) >>> 0;
    }
    WASM_VECTOR_LEN = offset;
    return ptr;
  }
  function isLikeNone(x) {
    return x === void 0 || x === null;
  }
  let cachedInt32Memory0 = null;
  function getInt32Memory0() {
    if (cachedInt32Memory0 === null || cachedInt32Memory0.byteLength === 0) {
      cachedInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachedInt32Memory0;
  }
  let cachedFloat64Memory0 = null;
  function getFloat64Memory0() {
    if (cachedFloat64Memory0 === null || cachedFloat64Memory0.byteLength === 0) {
      cachedFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachedFloat64Memory0;
  }
  let cachedBigInt64Memory0 = null;
  function getBigInt64Memory0() {
    if (cachedBigInt64Memory0 === null || cachedBigInt64Memory0.byteLength === 0) {
      cachedBigInt64Memory0 = new BigInt64Array(wasm.memory.buffer);
    }
    return cachedBigInt64Memory0;
  }
  function debugString(val) {
    const type = typeof val;
    if (type == "number" || type == "boolean" || val == null) {
      return `${val}`;
    }
    if (type == "string") {
      return `"${val}"`;
    }
    if (type == "symbol") {
      const description = val.description;
      if (description == null) {
        return "Symbol";
      } else {
        return `Symbol(${description})`;
      }
    }
    if (type == "function") {
      const name = val.name;
      if (typeof name == "string" && name.length > 0) {
        return `Function(${name})`;
      } else {
        return "Function";
      }
    }
    if (Array.isArray(val)) {
      const length = val.length;
      let debug = "[";
      if (length > 0) {
        debug += debugString(val[0]);
      }
      for (let i = 1; i < length; i++) {
        debug += ", " + debugString(val[i]);
      }
      debug += "]";
      return debug;
    }
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
      className = builtInMatches[1];
    } else {
      return toString.call(val);
    }
    if (className == "Object") {
      try {
        return "Object(" + JSON.stringify(val) + ")";
      } catch (_) {
        return "Object";
      }
    }
    if (val instanceof Error) {
      return `${val.name}: ${val.message}
${val.stack}`;
    }
    return className;
  }
  const CLOSURE_DTORS = typeof FinalizationRegistry === "undefined" ? { register: () => {
  }, unregister: () => {
  } } : new FinalizationRegistry((state) => {
    wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b);
  });
  function makeClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
      state.cnt++;
      try {
        return f(state.a, state.b, ...args);
      } finally {
        if (--state.cnt === 0) {
          wasm.__wbindgen_export_2.get(state.dtor)(state.a, state.b);
          state.a = 0;
          CLOSURE_DTORS.unregister(state);
        }
      }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
  }
  function __wbg_adapter_50(arg0, arg1) {
    wasm._dyn_core__ops__function__Fn_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h3a38eba89bd7eee2(arg0, arg1);
  }
  function __wbg_adapter_53(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__Fn__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h6db2f9b419caf886(arg0, arg1, addHeapObject(arg2));
  }
  function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
      state.cnt++;
      const a = state.a;
      state.a = 0;
      try {
        return f(a, state.b, ...args);
      } finally {
        if (--state.cnt === 0) {
          wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);
          CLOSURE_DTORS.unregister(state);
        } else {
          state.a = a;
        }
      }
    };
    real.original = state;
    CLOSURE_DTORS.register(real, state, state);
    return real;
  }
  function __wbg_adapter_56(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__haa1a6f11fd24dced(arg0, arg1);
  }
  function __wbg_adapter_59(arg0, arg1, arg2) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h544c00ee3e7cec57(retptr, arg0, arg1, addHeapObject(arg2));
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function __wbg_adapter_62(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h1a986fe75f20092b(arg0, arg1, addHeapObject(arg2));
  }
  function core_create_context(config_json) {
    let deferred2_0;
    let deferred2_1;
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(config_json, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      wasm.core_create_context(retptr, ptr0, len0);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      deferred2_0 = r0;
      deferred2_1 = r1;
      return getStringFromWasm0(r0, r1);
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
      wasm.__wbindgen_free(deferred2_0, deferred2_1, 1);
    }
  }
  function core_request(context, function_name, params, request_id) {
    try {
      const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
      const ptr0 = passStringToWasm0(function_name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len0 = WASM_VECTOR_LEN;
      wasm.core_request(retptr, context, ptr0, len0, addHeapObject(params), request_id);
      var r0 = getInt32Memory0()[retptr / 4 + 0];
      var r1 = getInt32Memory0()[retptr / 4 + 1];
      if (r1) {
        throw takeObject(r0);
      }
    } finally {
      wasm.__wbindgen_add_to_stack_pointer(16);
    }
  }
  function core_destroy_context(context) {
    wasm.core_destroy_context(context);
  }
  function handleError(f, args) {
    try {
      return f.apply(this, args);
    } catch (e) {
      wasm.__wbindgen_exn_store(addHeapObject(e));
    }
  }
  async function __wbg_load(module2, imports) {
    if (typeof Response === "function" && module2 instanceof Response) {
      if (typeof WebAssembly.instantiateStreaming === "function") {
        try {
          return await WebAssembly.instantiateStreaming(module2, imports);
        } catch (e) {
          if (module2.headers.get("Content-Type") != "application/wasm") {
            console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
          } else {
            throw e;
          }
        }
      }
      const bytes = await module2.arrayBuffer();
      return await WebAssembly.instantiate(bytes, imports);
    } else {
      const instance = await WebAssembly.instantiate(module2, imports);
      if (instance instanceof WebAssembly.Instance) {
        return { instance, module: module2 };
      } else {
        return instance;
      }
    }
  }
  function __wbg_get_imports() {
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_28c511d9baebfa89 = function(arg0, arg1) {
      const ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_72fb9a18b5ae2624 = function() {
      const ret = new Object();
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
      takeObject(arg0);
    };
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
      const ret = getStringFromWasm0(arg0, arg1);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_String_63b60bf2d0a90959 = function(arg0, arg1) {
      const ret = String(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_number_new = function(arg0) {
      const ret = arg0;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_message_5bf28016c2b49cfb = function(arg0) {
      const ret = getObject(arg0).message;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_coreresponsehandler_20bcf2bc15d3b9a9 = function(arg0, arg1, arg2, arg3) {
      core_response_handler(arg0 >>> 0, takeObject(arg1), arg2 >>> 0, arg3 !== 0);
    };
    imports.wbg.__wbindgen_string_get = function(arg0, arg1) {
      const obj = getObject(arg1);
      const ret = typeof obj === "string" ? obj : void 0;
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
      const ret = getObject(arg0) === void 0;
      return ret;
    };
    imports.wbg.__wbindgen_is_null = function(arg0) {
      const ret = getObject(arg0) === null;
      return ret;
    };
    imports.wbg.__wbg_String_b9412f8799faab3e = function(arg0, arg1) {
      const ret = String(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_new0_7d84e5b2cd9fdc73 = function() {
      const ret = /* @__PURE__ */ new Date();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTime_2bc4375165f02d15 = function(arg0) {
      const ret = getObject(arg0).getTime();
      return ret;
    };
    imports.wbg.__wbg_crypto_8f90fdde9566e2ad = function(arg0) {
      const ret = getObject(arg0).crypto;
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_object = function(arg0) {
      const val = getObject(arg0);
      const ret = typeof val === "object" && val !== null;
      return ret;
    };
    imports.wbg.__wbg_process_8eb2777bc1b6b0fa = function(arg0) {
      const ret = getObject(arg0).process;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_versions_50a627196d924b94 = function(arg0) {
      const ret = getObject(arg0).versions;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_node_fe444c3146177840 = function(arg0) {
      const ret = getObject(arg0).node;
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_string = function(arg0) {
      const ret = typeof getObject(arg0) === "string";
      return ret;
    };
    imports.wbg.__wbg_require_118cb4d5bf61ca1d = function() {
      return handleError(function() {
        const ret = module.require;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbindgen_is_function = function(arg0) {
      const ret = typeof getObject(arg0) === "function";
      return ret;
    };
    imports.wbg.__wbg_call_b3ca7c6051f9bec1 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_msCrypto_31602000d4eb6ef9 = function(arg0) {
      const ret = getObject(arg0).msCrypto;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithlength_e9b4878cebadb3d3 = function(arg0) {
      const ret = new Uint8Array(arg0 >>> 0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_transaction_1e282a79e9bb7387 = function() {
      return handleError(function(arg0, arg1, arg2, arg3) {
        const ret = getObject(arg0).transaction(getStringFromWasm0(arg1, arg2), takeObject(arg3));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_setoncomplete_d8e4236665cbf1e2 = function(arg0, arg1) {
      getObject(arg0).oncomplete = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_da071ec94e148397 = function(arg0, arg1) {
      getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_setonabort_523135fd9168ae8b = function(arg0, arg1) {
      getObject(arg0).onabort = getObject(arg1);
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
      const obj = takeObject(arg0).original;
      if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
      }
      const ret = false;
      return ret;
    };
    imports.wbg.__wbg_target_2fc177e386c8b7b0 = function(arg0) {
      const ret = getObject(arg0).target;
      return isLikeNone(ret) ? 0 : addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
      const ret = getObject(arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_readyState_f8d58cc9e9c4f906 = function(arg0) {
      const ret = getObject(arg0).readyState;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_setonsuccess_632ce0a1460455c2 = function(arg0, arg1) {
      getObject(arg0).onsuccess = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_8479b33e7568a904 = function(arg0, arg1) {
      getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_objectStore_da468793bd9df17b = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).objectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbindgen_memory = function() {
      const ret = wasm.memory;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_12d079cc21e14bdb = function(arg0) {
      const ret = getObject(arg0).buffer;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_63b92bc8671ed464 = function(arg0) {
      const ret = new Uint8Array(getObject(arg0));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_a47bac70306a19a7 = function(arg0, arg1, arg2) {
      getObject(arg0).set(getObject(arg1), arg2 >>> 0);
    };
    imports.wbg.__wbg_length_c20a40f15020d68a = function(arg0) {
      const ret = getObject(arg0).length;
      return ret;
    };
    imports.wbg.__wbg_call_27c0f87801dedf93 = function() {
      return handleError(function(arg0, arg1) {
        const ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_iterator_2cee6dadfd956dfa = function() {
      const ret = Symbol.iterator;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_40fc327bfc8770e6 = function(arg0) {
      const ret = getObject(arg0).next;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_next_196c84450b364254 = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).next();
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_done_298b57d23c0fc80c = function(arg0) {
      const ret = getObject(arg0).done;
      return ret;
    };
    imports.wbg.__wbg_value_d93c65011f51a456 = function(arg0) {
      const ret = getObject(arg0).value;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_bd8e338fbd5f5cc8 = function(arg0, arg1) {
      const ret = getObject(arg0)[arg1 >>> 0];
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_get_e3c254076557e348 = function() {
      return handleError(function(arg0, arg1) {
        const ret = Reflect.get(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_set_1f9b04f170055d33 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
      }, arguments);
    };
    imports.wbg.__wbg_self_ce0dbfc45cf2f5be = function() {
      return handleError(function() {
        const ret = self.self;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_window_c6fb939a7f436783 = function() {
      return handleError(function() {
        const ret = window.window;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_globalThis_d1e6af4856ba331b = function() {
      return handleError(function() {
        const ret = globalThis.globalThis;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_global_207b558942527489 = function() {
      return handleError(function() {
        const ret = global.global;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_newnoargs_e258087cd0daa0ea = function(arg0, arg1) {
      const ret = new Function(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_aa4a17c33a06e5cb = function(arg0, arg1, arg2) {
      const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_randomFillSync_bf004fc1e39ad54a = function() {
      return handleError(function(arg0, arg1) {
        getObject(arg0).randomFillSync(takeObject(arg1));
      }, arguments);
    };
    imports.wbg.__wbg_subarray_a1f73cd4b5b42fe1 = function(arg0, arg1, arg2) {
      const ret = getObject(arg0).subarray(arg1 >>> 0, arg2 >>> 0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_getRandomValues_47a210009a601d67 = function() {
      return handleError(function(arg0, arg1) {
        getObject(arg0).getRandomValues(getObject(arg1));
      }, arguments);
    };
    imports.wbg.__wbindgen_error_new = function(arg0, arg1) {
      const ret = new Error(getStringFromWasm0(arg0, arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_loose_eq = function(arg0, arg1) {
      const ret = getObject(arg0) == getObject(arg1);
      return ret;
    };
    imports.wbg.__wbindgen_boolean_get = function(arg0) {
      const v = getObject(arg0);
      const ret = typeof v === "boolean" ? v ? 1 : 0 : 2;
      return ret;
    };
    imports.wbg.__wbindgen_number_get = function(arg0, arg1) {
      const obj = getObject(arg1);
      const ret = typeof obj === "number" ? obj : void 0;
      getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
      getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbg_instanceof_Uint8Array_2b3bbecd033d19f6 = function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Uint8Array;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbg_instanceof_ArrayBuffer_836825be07d4c9d2 = function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof ArrayBuffer;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbg_instanceof_Error_e20bb56fd5591a93 = function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Error;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbg_stringify_8887fe74e1c50d81 = function() {
      return handleError(function(arg0) {
        const ret = JSON.stringify(getObject(arg0));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_setTimeout_c172d5704ef82276 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
        return ret;
      }, arguments);
    };
    imports.wbg.__wbg_clearTimeout_ba63ae54a36e111e = function(arg0, arg1) {
      getObject(arg0).clearTimeout(arg1);
    };
    imports.wbg.__wbg_headers_abb199c3be8d817c = function(arg0) {
      const ret = getObject(arg0).headers;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_cb0e7a5c2dd66afd = function() {
      return handleError(function(arg0, arg1, arg2, arg3, arg4) {
        getObject(arg0).set(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
      }, arguments);
    };
    imports.wbg.__wbg_fetch_c4b6afebdb1f918e = function(arg0, arg1) {
      const ret = getObject(arg0).fetch(getObject(arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Response_849eb93e75734b6e = function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Response;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbg_status_61a01141acd3cf74 = function(arg0) {
      const ret = getObject(arg0).status;
      return ret;
    };
    imports.wbg.__wbg_url_5f6dc4009ac5f99d = function(arg0, arg1) {
      const ret = getObject(arg1).url;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_message_c539585471131985 = function(arg0, arg1) {
      const ret = getObject(arg1).message;
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_put_22792e17580ca18b = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).put(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_setonupgradeneeded_ad7645373c7d5e1b = function(arg0, arg1) {
      getObject(arg0).onupgradeneeded = getObject(arg1);
    };
    imports.wbg.__wbg_setonblocked_eb1032a3dfaabd1c = function(arg0, arg1) {
      getObject(arg0).onblocked = getObject(arg1);
    };
    imports.wbg.__wbg_setonversionchange_af0457acbb949df2 = function(arg0, arg1) {
      getObject(arg0).onversionchange = getObject(arg1);
    };
    imports.wbg.__wbg_Window_18c70cd8aae46148 = function(arg0) {
      const ret = getObject(arg0).Window;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_7c51d9056667f4e0 = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_WorkerGlobalScope_e05a65389c91124f = function(arg0) {
      const ret = getObject(arg0).WorkerGlobalScope;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_d312f95759a15fdc = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_global_43fcc492dd43a370 = function(arg0) {
      const ret = getObject(arg0).global;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_indexedDB_dc5bedbc95106b81 = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).indexedDB;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_open_a05198d687357536 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_get_5361b64cac0d0826 = function() {
      return handleError(function(arg0, arg1) {
        const ret = getObject(arg0).get(getObject(arg1));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_new_6c74223c77cfabad = function() {
      return handleError(function(arg0, arg1) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_newwithstr_31798037aa20dbc1 = function() {
      return handleError(function(arg0, arg1, arg2, arg3) {
        const ret = new WebSocket(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_setonmessage_2af154ce83a3dc94 = function(arg0, arg1) {
      getObject(arg0).onmessage = getObject(arg1);
    };
    imports.wbg.__wbg_setonopen_ce7a4c51e5cf5788 = function(arg0, arg1) {
      getObject(arg0).onopen = getObject(arg1);
    };
    imports.wbg.__wbg_setonerror_39a785302b0cd2e9 = function(arg0, arg1) {
      getObject(arg0).onerror = getObject(arg1);
    };
    imports.wbg.__wbg_close_acd9532ff5c093ea = function() {
      return handleError(function(arg0) {
        getObject(arg0).close();
      }, arguments);
    };
    imports.wbg.__wbg_send_70603dff16b81b66 = function() {
      return handleError(function(arg0, arg1, arg2) {
        getObject(arg0).send(getStringFromWasm0(arg1, arg2));
      }, arguments);
    };
    imports.wbg.__wbg_data_3ce7c145ca4fbcdc = function(arg0) {
      const ret = getObject(arg0).data;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_objectStoreNames_588b5924274239fd = function(arg0) {
      const ret = getObject(arg0).objectStoreNames;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_item_87130eb4d38ecdc5 = function(arg0, arg1, arg2) {
      const ret = getObject(arg1).item(arg2 >>> 0);
      var ptr1 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      var len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_createObjectStore_882f2f6b1b1ef040 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = getObject(arg0).createObjectStore(getStringFromWasm0(arg1, arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_new_cf3ec55744a78578 = function(arg0) {
      const ret = new Date(getObject(arg0));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_getTimezoneOffset_38257122e236c190 = function(arg0) {
      const ret = getObject(arg0).getTimezoneOffset();
      return ret;
    };
    imports.wbg.__wbg_newwithlength_66ae46612e7f0234 = function(arg0) {
      const ret = new Array(arg0 >>> 0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_d4638f722068f043 = function(arg0, arg1, arg2) {
      getObject(arg0)[arg1 >>> 0] = takeObject(arg2);
    };
    imports.wbg.__wbg_newwithu8arraysequence_9d62f79f4425e877 = function() {
      return handleError(function(arg0) {
        const ret = new Blob(getObject(arg0));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_keys_91e412b4b222659f = function(arg0) {
      const ret = Object.keys(getObject(arg0));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_length_cd7af8117672b8b8 = function(arg0) {
      const ret = getObject(arg0).length;
      return ret;
    };
    imports.wbg.__wbg_new_16b304a2cfa7ff4a = function() {
      const ret = new Array();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_new_d9bc3a0147634640 = function() {
      const ret = /* @__PURE__ */ new Map();
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_8417257aaedc936b = function(arg0, arg1, arg2) {
      const ret = getObject(arg0).set(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_6648ce0320163d0f = function(arg0, arg1, arg2) {
      getObject(arg0)[takeObject(arg1)] = takeObject(arg2);
    };
    imports.wbg.__wbindgen_is_bigint = function(arg0) {
      const ret = typeof getObject(arg0) === "bigint";
      return ret;
    };
    imports.wbg.__wbg_isSafeInteger_f7b04ef02296c4d2 = function(arg0) {
      const ret = Number.isSafeInteger(getObject(arg0));
      return ret;
    };
    imports.wbg.__wbindgen_bigint_get_as_i64 = function(arg0, arg1) {
      const v = getObject(arg1);
      const ret = typeof v === "bigint" ? v : void 0;
      getBigInt64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? BigInt(0) : ret;
      getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
    };
    imports.wbg.__wbindgen_bigint_from_i64 = function(arg0) {
      const ret = arg0;
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_jsval_eq = function(arg0, arg1) {
      const ret = getObject(arg0) === getObject(arg1);
      return ret;
    };
    imports.wbg.__wbg_isArray_2ab64d95e09ea0ae = function(arg0) {
      const ret = Array.isArray(getObject(arg0));
      return ret;
    };
    imports.wbg.__wbindgen_in = function(arg0, arg1) {
      const ret = getObject(arg0) in getObject(arg1);
      return ret;
    };
    imports.wbg.__wbg_instanceof_Map_87917e0a7aaf4012 = function(arg0) {
      let result;
      try {
        result = getObject(arg0) instanceof Map;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbindgen_bigint_from_u64 = function(arg0) {
      const ret = BigInt.asUintN(64, arg0);
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_entries_95cc2c823b285a09 = function(arg0) {
      const ret = Object.entries(getObject(arg0));
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
      throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_debug_string = function(arg0, arg1) {
      const ret = debugString(getObject(arg1));
      const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
      const len1 = WASM_VECTOR_LEN;
      getInt32Memory0()[arg0 / 4 + 1] = len1;
      getInt32Memory0()[arg0 / 4 + 0] = ptr1;
    };
    imports.wbg.__wbg_then_0c86a60e8fcfe9f6 = function(arg0, arg1) {
      const ret = getObject(arg0).then(getObject(arg1));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_queueMicrotask_481971b0d87f3dd4 = function(arg0) {
      queueMicrotask(getObject(arg0));
    };
    imports.wbg.__wbg_queueMicrotask_3cbae2ec6b6cd3d6 = function(arg0) {
      const ret = getObject(arg0).queueMicrotask;
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_resolve_b0083a7967828ec8 = function(arg0) {
      const ret = Promise.resolve(getObject(arg0));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_then_a73caa9a87991566 = function(arg0, arg1, arg2) {
      const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
      return addHeapObject(ret);
    };
    imports.wbg.__wbg_instanceof_Window_f401953a2cf86220 = function(arg0) {
      let result;
      try {
        result = true;
      } catch (_) {
        result = false;
      }
      const ret = result;
      return ret;
    };
    imports.wbg.__wbg_text_450a059667fd91fd = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).text();
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_error_685b20024dc2d6ca = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).error;
        return isLikeNone(ret) ? 0 : addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_result_6cedf5f78600a79c = function() {
      return handleError(function(arg0) {
        const ret = getObject(arg0).result;
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbg_newwithstrandinit_3fd6fba4083ff2d0 = function() {
      return handleError(function(arg0, arg1, arg2) {
        const ret = new Request(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
      }, arguments);
    };
    imports.wbg.__wbindgen_closure_wrapper777 = function(arg0, arg1, arg2) {
      const ret = makeClosure(arg0, arg1, 81, __wbg_adapter_50);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper780 = function(arg0, arg1, arg2) {
      const ret = makeClosure(arg0, arg1, 81, __wbg_adapter_53);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper3746 = function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 480, __wbg_adapter_56);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper4468 = function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_59);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5747 = function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_62);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5749 = function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 1324, __wbg_adapter_62);
      return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper5750 = function(arg0, arg1, arg2) {
      const ret = makeMutClosure(arg0, arg1, 483, __wbg_adapter_62);
      return addHeapObject(ret);
    };
    return imports;
  }
  function __wbg_init_memory(imports, maybe_memory) {
  }
  function __wbg_finalize_init(instance, module2) {
    wasm = instance.exports;
    init3.__wbindgen_wasm_module = module2;
    cachedBigInt64Memory0 = null;
    cachedFloat64Memory0 = null;
    cachedInt32Memory0 = null;
    cachedUint8Memory0 = null;
    return wasm;
  }
  function initSync(module2) {
    if (wasm !== void 0) return wasm;
    const imports = __wbg_get_imports();
    __wbg_init_memory(imports);
    if (!(module2 instanceof WebAssembly.Module)) {
      module2 = new WebAssembly.Module(module2);
    }
    const instance = new WebAssembly.Instance(module2, imports);
    return __wbg_finalize_init(instance, module2);
  }
  async function init3(input) {
    if (wasm !== void 0) return wasm;
    if (typeof input === "undefined") {
    }
    const imports = __wbg_get_imports();
    if (typeof input === "string" || typeof Request === "function" && input instanceof Request || typeof URL === "function" && input instanceof URL) {
      input = fetch(input);
    }
    __wbg_init_memory(imports);
    const { instance, module: module2 } = await __wbg_load(await input, imports);
    return __wbg_finalize_init(instance, module2);
  }
  function replaceUndefinedWithNulls(value) {
    if (value === void 0) {
      return null;
    }
    if (value instanceof Blob) {
      return value;
    }
    if (typeof value === "object" && value !== null) {
      const result = Array.isArray(value) ? [] : {};
      for (const key in value) {
        result[key] = replaceUndefinedWithNulls(value[key]);
      }
      return result;
    }
    return value;
  }
  async function replaceBlobsWithArrayBuffers(value) {
    if (value instanceof Blob) {
      return await value.arrayBuffer();
    }
    if (typeof value === "bigint") {
      if (value < Number.MAX_SAFE_INTEGER && value > Number.MIN_SAFE_INTEGER) {
        return Number(value);
      } else {
        return value.toString();
      }
    }
    if (typeof value === "object" && value !== null) {
      const result = Array.isArray(value) ? [] : {};
      for (const key in value) {
        result[key] = await replaceBlobsWithArrayBuffers(value[key]);
      }
      return result;
    }
    return value;
  }
  let deferredCreateContext = [];
  let responseHandler = null;
  function core_response_handler(request_id, params, response_type, finished) {
    if (responseHandler) {
      responseHandler(
        request_id,
        params,
        response_type,
        finished
      );
    }
  }
  (async () => {
    await init3(await loadModule());
    for (const createContext of deferredCreateContext) {
      createContext.resolve(core_create_context(createContext.configJson));
    }
    deferredCreateContext = null;
  })();
  return Promise.resolve({
    getLibName,
    setResponseParamsHandler: (handler) => {
      responseHandler = handler;
    },
    createContext: (configJson) => {
      return deferredCreateContext === null ? Promise.resolve(core_create_context(configJson)) : new Promise((resolve) => {
        deferredCreateContext.push({
          configJson,
          resolve
        });
      });
    },
    destroyContext: (context) => {
      core_destroy_context(context);
    },
    sendRequestParams: (context, requestId, functionName, functionParams) => {
      (async () => {
        core_request(
          context,
          functionName,
          await replaceBlobsWithArrayBuffers(functionParams),
          requestId
        );
      })();
    }
  });
}
function libWeb() {
  return options && options.disableSeparateWorker ? withoutSeparateWorker() : withSeparateWorker();
}

// src/offscreen.js
var client = null;
var ready = false;
var initPromise = null;
async function init2() {
  if (!initPromise) {
    initPromise = (async () => {
      libWebSetup({ binaryURL: "./tvmsdk.wasm" });
      import_core.TvmClient.useBinaryLibrary(libWeb);
      client = new import_core.TvmClient();
      await client.client.version();
      ready = true;
      return { version: await client.client.version() };
    })();
  }
  return initPromise;
}
function whenReady() {
  return ready ? Promise.resolve() : init2();
}
function respond(id, resp) {
  chrome.runtime.sendMessage({ target: "offscreen", id, ...resp }).catch(() => {
  });
}
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (!msg || msg.target !== "offscreen") return false;
  if (msg.method === "ping") {
    sendResponse({ ok: true, ready });
    return true;
  }
  const { id, method, params } = msg;
  if (method === "init") {
    init2().then((result) => respond(id, { ok: true, result })).catch((e) => respond(id, { ok: false, error: String(e && e.message || e) }));
    return true;
  }
  handle(method, params, id);
  return true;
});
async function handle(method, params, id) {
  try {
    await whenReady();
    const [mod, fn] = method.split(".");
    const api = client[mod];
    if (!api || typeof api[fn] !== "function") {
      respond(id, { ok: false, error: `unknown sdk call: ${method}` });
      return;
    }
    if (fn.endsWith("_sync")) {
      respond(id, { ok: true, result: api[fn](params || {}) });
      return;
    }
    const result = await api[fn](params || {});
    respond(id, { ok: true, result });
  } catch (e) {
    const err = e && typeof e === "object" ? String(e.message || JSON.stringify(e)) : String(e);
    respond(id, { ok: false, error: err });
  }
}
init2().then(() => console.log("[offscreen] sdk ready")).catch((e) => console.error("[offscreen] init failed", e));
//# sourceMappingURL=offscreen.js.map
