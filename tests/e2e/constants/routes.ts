const auth = {
  login: '/auth/telegram',
};

const users = {
  getUsers: '/users',
  deleteById: (id: string) => `/users/${id}`,
  setSearchProfileLimit: (id: string) => `/users/${id}/search-profile-limit`,
};

const searchProfiles = {
  create: '/search-profiles',
  byId: (id: string) => `/search-profiles/${id}`, // shared by GET, PATCH, DELETE — only the HTTP method differs
};

export const routes = {
  auth,
  users,
  searchProfiles,
} as const;
