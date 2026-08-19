const auth = {
  login: '/auth/telegram',
};

const users = {
  list: '/users',
};

export const routes = {
  auth,
  users,
} as const;
