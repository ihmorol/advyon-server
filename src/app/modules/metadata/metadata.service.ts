import httpStatus from 'http-status';
import AppError from '../../errors/appError';
import {
  DEFAULT_METADATA,
  METADATA_TYPES,
} from './metadata.constant';
import {
  IMetadataQueryOptions,
  IMetadataResponse,
  IMetadataSeed,
  TMetadataType,
} from './metadata.interface';
import { MetadataModel } from './metadata.model';

type CacheEntry = {
  data: IMetadataResponse[];
  expiresAt: number;
};

const cacheStore = new Map<string, CacheEntry>();

const DEFAULT_TTL = 15 * 60 * 1000;

const getCacheTtl = () => {
  const ttl = Number(process.env.METADATA_CACHE_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL;
};

const cacheKey = (type: string, includeInactive: boolean) =>
  `${type}|${includeInactive ? 'all' : 'active'}`;

const isDbEnabled = () => process.env.METADATA_DB_ENABLED !== 'false';

const slugify = (input: string) =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 64);

const mapSeedToResponse = (
  type: TMetadataType,
  seed: IMetadataSeed,
  index: number,
): IMetadataResponse => {
  const key = seed.key ?? slugify(seed.label);
  return {
    id: `${type}-${key}`,
    key,
    label: seed.label,
    description: seed.description,
    region: seed.region,
    locale: seed.locale ?? 'en-US',
    color: seed.color,
    icon: seed.icon,
    sortOrder: seed.sortOrder ?? (index + 1) * 10,
    isActive: seed.isActive ?? true,
    metadata: seed.metadata,
  };
};

const mapDocToResponse = (item: any): IMetadataResponse => ({
  id: item._id?.toString() ?? `${item.type}-${item.key}`,
  key: item.key,
  label: item.label,
  description: item.description,
  region: item.region,
  locale: item.locale,
  color: item.color,
  icon: item.icon,
  sortOrder: item.sortOrder ?? 0,
  isActive: item.isActive ?? true,
  metadata: item.metadata,
  updatedAt: item.updatedAt,
});

const getSeeds = (type: TMetadataType) =>
  DEFAULT_METADATA[type]?.map((seed, index) =>
    mapSeedToResponse(type, seed, index),
  ) ?? [];

const readFromCache = (key: string) => {
  const entry = cacheStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    cacheStore.delete(key);
    return null;
  }
  return entry.data;
};

const writeToCache = (key: string, data: IMetadataResponse[]) => {
  cacheStore.set(key, { data, expiresAt: Date.now() + getCacheTtl() });
};

const invalidateCache = (type?: TMetadataType) => {
  if (!type) {
    cacheStore.clear();
    return;
  }
  const prefixes = [
    cacheKey(type, true),
    cacheKey(type, false),
  ];
  prefixes.forEach(key => cacheStore.delete(key));
};

const ensureSeeded = async (type: TMetadataType) => {
  if (!isDbEnabled()) return;
  const existing = await MetadataModel.countDocuments({ type });
  if (existing > 0) return;
  const seeds = DEFAULT_METADATA[type] ?? [];
  if (!seeds.length) return;
  await MetadataModel.insertMany(
    seeds.map((seed, index) => ({
      type,
      key: seed.key ?? slugify(seed.label),
      label: seed.label,
      description: seed.description,
      region: seed.region,
      locale: seed.locale ?? 'en-US',
      color: seed.color,
      icon: seed.icon,
      sortOrder: seed.sortOrder ?? (index + 1) * 10,
      isActive: seed.isActive ?? true,
      metadata: seed.metadata ?? {},
    })),
    { ordered: false },
  );
};

const fetchFromDb = async (
  type: TMetadataType,
  includeInactive: boolean,
) => {
  if (!isDbEnabled()) return [];
  await ensureSeeded(type);
  const query: Record<string, unknown> = { type };
  if (!includeInactive) {
    query.isActive = true;
  }
  const docs = await MetadataModel.find(query)
    .sort({ sortOrder: 1, label: 1 })
    .lean();
  return docs.map(mapDocToResponse);
};

const getMetadataByType = async (
  type: TMetadataType,
  options: IMetadataQueryOptions = {},
) => {
  if (!METADATA_TYPES.includes(type)) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Unknown metadata type');
  }
  const includeInactive = Boolean(options.includeInactive);
  const skipCache = Boolean(options.skipCache);
  const key = cacheKey(type, includeInactive);
  if (!skipCache) {
    const cached = readFromCache(key);
    if (cached) return cached;
  }

  const dbData = await fetchFromDb(type, includeInactive);
  const data = dbData.length ? dbData : getSeeds(type);
  writeToCache(key, data);
  return data;
};

const getAllMetadata = async (options: IMetadataQueryOptions = {}) => {
  const includeInactive = Boolean(options.includeInactive);
  const skipCache = Boolean(options.skipCache);

  const datasets = await Promise.all(
    METADATA_TYPES.map(type =>
      getMetadataByType(type, {
        includeInactive,
        skipCache,
      }),
    ),
  );

  return Object.fromEntries(
    METADATA_TYPES.map((type, index) => [type, datasets[index]]),
  ) as Record<TMetadataType, IMetadataResponse[]>;
};

const assertDbAccess = () => {
  if (!isDbEnabled()) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      'Metadata admin mutations disabled (set METADATA_DB_ENABLED=true)',
    );
  }
};

const createMetadataEntry = async (
  type: TMetadataType,
  payload: IMetadataSeed,
) => {
  assertDbAccess();
  if (!payload.label) {
    throw new AppError(httpStatus.BAD_REQUEST, 'Label is required');
  }

  const key = payload.key ? slugify(payload.key) : slugify(payload.label);
  const result = await MetadataModel.create({
    type,
    key,
    label: payload.label,
    description: payload.description,
    region: payload.region,
    locale: payload.locale ?? 'en-US',
    color: payload.color,
    icon: payload.icon,
    sortOrder: payload.sortOrder ?? 0,
    isActive: payload.isActive ?? true,
    metadata: payload.metadata ?? {},
  });

  invalidateCache(type);

  return mapDocToResponse(result);
};

const updateMetadataEntry = async (
  id: string,
  payload: Partial<IMetadataSeed>,
) => {
  assertDbAccess();
  const update: Record<string, unknown> = {};
  const allowedFields: Array<keyof IMetadataSeed> = [
    'label',
    'description',
    'region',
    'locale',
    'color',
    'icon',
    'sortOrder',
    'isActive',
    'metadata',
  ];
  allowedFields.forEach(field => {
    if (payload[field] !== undefined) {
      update[field] = payload[field];
    }
  });
  if (payload.key) {
    update.key = slugify(payload.key);
  }

  const updated = await MetadataModel.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true },
  ).lean();

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Metadata entry not found');
  }

  invalidateCache(updated.type as TMetadataType);

  return mapDocToResponse(updated);
};

const updateMetadataStatus = async (id: string, isActive: boolean) => {
  assertDbAccess();
  const updated = await MetadataModel.findByIdAndUpdate(
    id,
    { $set: { isActive } },
    { new: true },
  ).lean();

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, 'Metadata entry not found');
  }

  invalidateCache(updated.type as TMetadataType);

  return mapDocToResponse(updated);
};

export const MetadataServices = {
  getMetadataByType,
  getAllMetadata,
  createMetadataEntry,
  updateMetadataEntry,
  updateMetadataStatus,
  invalidateCache,
  getSeeds,
};
