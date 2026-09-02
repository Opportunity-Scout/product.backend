const auth = {
  login: '/auth/telegram',
};

const users = {
  getUsers: '/users',
  deleteById: (id: string) => `/users/${id}`,
  setSearchProfileLimit: (id: string) => `/users/${id}/search-profile-limit`,
};

export const routes = {
  auth,
  users,
} as const;
