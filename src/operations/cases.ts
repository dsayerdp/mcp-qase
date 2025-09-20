import { TestCaseCreate, TestCaseUpdate } from 'qaseio';
import { z } from 'zod';
import { client, toResult } from '../utils.js';
import { apply, pipe } from 'ramda';
import { resolveSystemFieldOptionId } from '../system-field-options.js';

const enumValueSchema = z.union([z.number(), z.string().min(1)]);

export const GetCasesSchema = z.object({
  code: z.string(),
  search: z.string().optional(),
  milestoneId: z.number().optional(),
  suiteId: z.number().optional(),
  severity: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  behavior: z.string().optional(),
  automation: z.string().optional(),
  status: z.string().optional(),
  externalIssuesType: z
    .enum([
      'asana',
      'azure-devops',
      'clickup-app',
      'github-app',
      'gitlab-app',
      'jira-cloud',
      'jira-server',
      'linear',
      'monday',
      'redmine-app',
      'trello-app',
      'youtrack-app',
    ])
    .optional(),
  externalIssuesIds: z.array(z.string()).optional(),
  include: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
});

export const GetCaseSchema = z.object({
  code: z.string(),
  id: z.number(),
});

export const CreateCaseSchema = z.object({
  code: z.string(),
  testCase: z.record(z.any()).transform((v) => v as TestCaseCreate),
});

export const UpdateCaseSchema = z.object({
  code: z.string(),
  id: z.number(),
  title: z.string().optional(),
  description: z.string().optional(),
  preconditions: z.string().optional(),
  postconditions: z.string().optional(),
  severity: enumValueSchema.optional(),
  priority: enumValueSchema.optional(),
  type: enumValueSchema.optional(),
  behavior: enumValueSchema.optional(),
  automation: enumValueSchema.optional(),
  status: enumValueSchema.optional(),
  suite_id: z.number().optional(),
  milestone_id: z.number().optional(),
  layer: enumValueSchema.optional(),
  is_flaky: z.boolean().optional(),
  params: z
    .array(
      z.object({
        title: z.string(),
        value: z.string(),
      }),
    )
    .optional(),
  tags: z.array(z.string()).optional(),
  steps: z
    .array(
      z.object({
        action: z.string(),
        expected_result: z.string().optional(),
        data: z.string().optional(),
        position: z.number().optional(),
      }),
    )
    .optional(),
  custom_fields: z
    .array(
      z.object({
        id: z.number(),
        value: z.string(),
      }),
    )
    .optional(),
});

export const CreateCaseBulkSchema = z.object({
  code: z.string(),
  cases: z.array(
    z.object({
      title: z.string(),
      description: z.string().optional(),
      preconditions: z.string().optional(),
      postconditions: z.string().optional(),
      severity: z.number().optional(),
      priority: z.number().optional(),
      type: z.number().optional(),
      behavior: z.number().optional(),
      automation: z.number().optional(),
      status: z.number().optional(),
      suite_id: z.number().optional(),
      milestone_id: z.number().optional(),
      layer: z.number().optional(),
      is_flaky: z.boolean().optional(),
      params: z
        .array(
          z.object({
            title: z.string(),
            value: z.string(),
          }),
        )
        .optional(),
      tags: z.array(z.string()).optional(),
      steps: z
        .array(
          z.object({
            action: z.string(),
            expected_result: z.string().optional(),
            data: z.string().optional(),
            position: z.number().optional(),
          }),
        )
        .optional(),
      custom_fields: z
        .array(
          z.object({
            id: z.number(),
            value: z.string(),
          }),
        )
        .optional(),
    }),
  ),
});

export const getCases = pipe(
  apply(client.cases.getCases.bind(client.cases)),
  toResult,
);

export const getCase = pipe(client.cases.getCase.bind(client.cases), toResult);

export const createCase = pipe(
  client.cases.createCase.bind(client.cases),
  toResult,
);

const convertCaseData = async (
  data: Omit<z.infer<typeof UpdateCaseSchema>, 'code' | 'id'>,
): Promise<TestCaseUpdate> => {
  const numericFields: Partial<
    Record<
      keyof typeof data,
      | 'severity'
      | 'priority'
      | 'behavior'
      | 'type'
      | 'status'
      | 'automation'
      | 'layer'
    >
  > = {
    severity: 'severity',
    priority: 'priority',
    behavior: 'behavior',
    type: 'type',
    status: 'status',
    automation: 'automation',
    layer: 'layer',
  } as const;

  const resolvedFieldEntries = await Promise.all(
    Object.entries(numericFields).map(async ([schemaKey, fieldKey]) => {
      const value = data[schemaKey as keyof typeof data];
      if (value === undefined) {
        return undefined;
      }
      const resolvedValue = await resolveSystemFieldOptionId(
        fieldKey as Parameters<typeof resolveSystemFieldOptionId>[0],
        value as string | number,
      );
      return [schemaKey, resolvedValue] as const;
    }),
  );

  const resolvedFieldMap = Object.fromEntries(
    resolvedFieldEntries.filter((entry): entry is [keyof typeof data, number] => !!entry),
  );

  const payload = {
    ...data,
    ...resolvedFieldMap,
    is_flaky: data.is_flaky === undefined ? undefined : data.is_flaky ? 1 : 0,
    params: data.params
      ? data.params.reduce(
          (acc, param) => ({
            ...acc,
            [param.title]: [param.value],
          }),
          {},
        )
      : undefined,
  };

  return payload as unknown as TestCaseUpdate;
};

export const updateCase = pipe(
  async (
    code: string,
    id: number,
    data: Omit<z.infer<typeof UpdateCaseSchema>, 'code' | 'id'>,
  ) => client.cases.updateCase(code, id, await convertCaseData(data)),
  toResult,
);
