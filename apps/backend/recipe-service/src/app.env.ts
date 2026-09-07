import { registerAs } from '@nestjs/config';

/** cloudinary://API_KEY:API_SECRET@CLOUD_NAME */
function fromCloudinaryUrl(raw?: string): {
  cloudName?: string;
  apiKey?: string;
  apiSecret?: string;
} {
  if (!raw?.startsWith('cloudinary://')) return {};
  try {
    const u = new URL(raw);
    return {
      cloudName: u.host || undefined,
      apiKey: decodeURIComponent(u.username || '') || undefined,
      apiSecret: decodeURIComponent(u.password || '') || undefined,
    };
  } catch {
    return {};
  }
}

export const appEnv = registerAs('app', () => {
  const fromUrl = fromCloudinaryUrl(process.env.CLOUDINARY_URL);
  return {
    port: Number(process.env.PORT ?? 3002),
    dbHost: process.env.RECIPE_DB_HOST ?? 'localhost',
    dbPort: Number(process.env.RECIPE_DB_PORT ?? 5432),
    dbUser: process.env.RECIPE_DB_USER ?? 'recipes',
    dbPassword: process.env.RECIPE_DB_PASSWORD ?? 'recipes',
    dbName: process.env.RECIPE_DB_NAME ?? 'recipes_db',
    userServiceUrl: process.env.USER_SERVICE_URL ?? 'http://localhost:3001',
    jwtAccessSecret:
      process.env.JWT_ACCESS_SECRET ?? 'homecook-dev-access-secret-change-me',
    cloudinaryCloudName:
      process.env.CLOUDINARY_CLOUD_NAME ??
      process.env.CLOUDINARY_NAME ??
      fromUrl.cloudName ??
      '',
    cloudinaryApiKey:
      process.env.CLOUDINARY_API_KEY ?? fromUrl.apiKey ?? '',
    cloudinaryApiSecret:
      process.env.CLOUDINARY_API_SECRET ?? fromUrl.apiSecret ?? '',
    /** Folder prefix on Cloudinary, e.g. Home/home-cook */
    cloudinaryFolder: process.env.CLOUDINARY_FOLDER ?? 'Home/home-cook',
  };
});
