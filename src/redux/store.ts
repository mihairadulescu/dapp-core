import { configureStore } from '@reduxjs/toolkit';

import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER
} from 'redux-persist';
import storage from 'redux-persist/lib/storage';

import rootReducer from './reducers';

const persistConfig = {
  key: 'dapp-core-store',
  version: 1,
  storage,
  whitelist: ['account', 'loginInfo', 'toasts', 'modals']
};

const localStorageReducers = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: localStorageReducers,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [
          FLUSH,
          REHYDRATE,
          PAUSE,
          PERSIST,
          PURGE,
          REGISTER,
          'appConfig/setProvider',
          'accountInfoSlice/setAccount',
          'accountInfoSlice/setAccountNonce'
        ],
        ignoredPaths: [
          'networkConfig.proxy',
          'networkConfig.apiProvider',
          'networkConfig.provider',
          'payload.nonce',
          'account.account.nonce'
        ]
      }
    })
});

export const persistor = persistStore(store);

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
