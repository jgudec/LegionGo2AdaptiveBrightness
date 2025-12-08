import { configureStore } from '@reduxjs/toolkit';
import { uiSlice, uiSliceMiddleware } from './uiSlice';

import { fanSlice,  } from './fanSlice';
// import { logger } from './logger';

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      uiSliceMiddleware
      // logger
    ])
});

// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<typeof store.getState>;
// Inferred type: {posts: PostsState, comments: CommentsState, users: UsersState}
export type AppDispatch = typeof store.dispatch;
