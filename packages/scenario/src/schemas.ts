import { z } from 'zod';

export const VerdictSchema = z.enum(['tp', 'fp', 'benign']);
export type Verdict = z.infer<typeof VerdictSchema>;

export const HintSchema = z.object({
  after_seconds: z.number().int().nonnegative(),
  text: z.string().min(1)
});

export const StepSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  prompt: z.string().min(1),
  console_focus: z.enum(['siem', 'xdr', 'firewall', 'any']).default('any'),
  expected_verdict: VerdictSchema.optional(),
  expected_mitre: z.array(z.string()).default([]),
  expected_indicators: z.array(z.string()).default([]),
  hints: z.array(HintSchema).default([]),
  hints_after_seconds: z.number().int().nonnegative().default(45),
  hints_interval_seconds: z.number().int().nonnegative().default(60),
  hint_penalty_percent: z.number().int().min(0).max(100).default(10)
});
export type Step = z.infer<typeof StepSchema>;

export const OperationSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, 'operation id must be kebab-case [a-z0-9-]'),
  title: z.string().min(1),
  summary: z.string().min(1),
  difficulty: z.enum(['easy', 'intermediate', 'hard']).default('intermediate'),
  duration_minutes: z.number().int().positive().default(30),
  xp: z.number().int().nonnegative().default(50),
  prerequisites: z.array(z.string()).default([]),
  mitre_techniques: z.array(z.string()).default([]),
  steps: z.array(StepSchema).min(1)
});
export type Operation = z.infer<typeof OperationSchema>;

export const AlertSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  source: z.enum(['siem', 'xdr', 'firewall', 'email']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  title: z.string().min(1),
  description: z.string().default(''),
  entities: z
    .object({
      ips: z.array(z.string()).default([]),
      hosts: z.array(z.string()).default([]),
      users: z.array(z.string()).default([]),
      file_hashes: z.array(z.string()).default([]),
      domains: z.array(z.string()).default([])
    })
    .default({})
});
export type Alert = z.infer<typeof AlertSchema>;

export const LogEventSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  source: z.enum(['siem', 'xdr', 'firewall']),
  host: z.string().optional(),
  user: z.string().optional(),
  process: z.string().optional(),
  pid: z.number().int().optional(),
  ppid: z.number().int().optional(),
  suspicious: z.boolean().default(false),
  suspicion_rule: z.string().optional(),
  event_type: z.string().min(1),
  fields: z.record(z.string(), z.unknown()).default({}),
  entities: z
    .object({
      ips: z.array(z.string()).default([]),
      hosts: z.array(z.string()).default([]),
      users: z.array(z.string()).default([]),
      file_hashes: z.array(z.string()).default([]),
      domains: z.array(z.string()).default([])
    })
    .default({})
});
export type LogEvent = z.infer<typeof LogEventSchema>;

export const FirewallConnectionSchema = z.object({
  id: z.string().min(1),
  ts: z.string().min(1),
  src_ip: z.string(),
  dst_ip: z.string(),
  dport: z.number().int(),
  proto: z.enum(['tcp', 'udp']),
  bytes_out: z.number().int().nonnegative().default(0),
  bytes_in: z.number().int().nonnegative().default(0),
  asn: z.string().optional(),
  dst_host: z.string().optional()
});
export type FirewallConnection = z.infer<typeof FirewallConnectionSchema>;

export const GroundTruthSchema = z.object({
  steps: z.array(
    z.object({
      step_id: z.string().min(1),
      verdict: VerdictSchema.optional(),
      mitre: z.array(z.string()).default([]),
      indicators: z.array(z.string()).default([]),
      references: z
        .object({
          alert_ids: z.array(z.string()).default([]),
          log_ids: z.array(z.string()).default([])
        })
        .default({})
    })
  ),
  operation_mitre: z.array(z.string()).default([])
});
export type GroundTruth = z.infer<typeof GroundTruthSchema>;

export const TrackSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(1),
  summary: z.string().min(1),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']).default('beginner'),
  operation_ids: z.array(z.string()).min(1),
  gating: z
    .object({
      threshold: z.number().int().min(0).max(100).default(70)
    })
    .default({ threshold: 70 })
});
export type Track = z.infer<typeof TrackSchema>;
