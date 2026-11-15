// Các React context được tạo ở file riêng (ít khi sửa) để Vite HMR không tạo ra hai bản context khác nhau
// khi bạn chỉnh file provider trong lúc `npm run dev` đang chạy.
import { createContext } from 'react';

export const ToastCtx = createContext(null);
export const SessionCtx = createContext(null);
export const SimCtx = createContext(null);
