import type { AxiosResponse } from 'axios';
import type {
  SystemField,
  SystemFieldListResponse,
  SystemFieldOption,
} from 'qaseio';
import { Configuration, SystemFieldsApi } from 'qaseio';
import { qaseApiToken } from './utils.js';

const FIELD_HINTS = {
  severity: ['case', 'severity'],
  priority: ['case', 'priority'],
  behavior: ['case', 'behavior'],
  type: ['case', 'type'],
  status: ['case', 'status'],
  automation: ['case', 'automation'],
  layer: ['case', 'layer'],
} as const;

type FieldKey = keyof typeof FIELD_HINTS;

let systemFieldsPromise: Promise<SystemField[]> | null = null;

const configuration = new Configuration({ apiKey: qaseApiToken });

const { QASE_API_HOST } = process.env;

if (QASE_API_HOST) {
  configuration.basePath = QASE_API_HOST.startsWith('http')
    ? QASE_API_HOST
    : `https://${QASE_API_HOST}`;
}

const systemFieldsApi = new SystemFieldsApi(configuration);

const normalise = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

const fetchSystemFields = async () => {
  if (!systemFieldsPromise) {
    systemFieldsPromise = systemFieldsApi
      .getSystemFields()
      .then((response: AxiosResponse<SystemFieldListResponse>) => response.data.result ?? [])
      .catch((error: unknown) => {
        systemFieldsPromise = null;
        throw error;
      });
  }
  return systemFieldsPromise;
};

const matchesHints = (text: string | undefined, hints: readonly string[]) =>
  !!text && hints.every((hint) => normalise(text).includes(normalise(hint)));

const findSystemField = async (key: FieldKey) => {
  const hints = FIELD_HINTS[key];
  const fields = await fetchSystemFields();
  return fields.find((field) =>
    matchesHints(field.slug, hints) || matchesHints(field.title, hints),
  );
};

const findOption = (options: SystemFieldOption[] | undefined | null, value: string) => {
  if (!options) {
    return undefined;
  }
  const normalisedValue = normalise(value);
  return options.find((option) =>
    [option.slug, option.title, option.id && option.id.toString()].some((candidate) =>
      candidate ? normalise(candidate) === normalisedValue : false,
    ),
  );
};

const describeOptions = (options: SystemFieldOption[] | undefined | null) =>
  options
    ?.map((option) => option.title || option.slug || (option.id ? option.id.toString() : ''))
    .filter((item) => item)
    .join(', ') || 'unknown';

export const resolveSystemFieldOptionId = async (
  key: FieldKey,
  value: string | number,
): Promise<number> => {
  if (typeof value === 'number') {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error(`Empty ${key} value`);
  }

  const numericCandidate = Number(trimmed);
  if (!Number.isNaN(numericCandidate)) {
    return numericCandidate;
  }

  const field = await findSystemField(key);
  if (!field) {
    throw new Error(`Unable to resolve ${key}; system field metadata is unavailable.`);
  }

  const option = findOption(field.options, trimmed);
  if (!option?.id) {
    throw new Error(
      `Unknown ${key} value "${value}". Available values: ${describeOptions(field.options)}.`,
    );
  }

  return option.id;
};

export const resetSystemFieldCache = () => {
  systemFieldsPromise = null;
};
