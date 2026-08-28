const auth = {
  login: '/auth/telegram',
};

const users = {
  list: '/users',
  deleteById: (id: string) => `/users/${id}`,
};

export const routes = {
  auth,
  users,
} as const;
