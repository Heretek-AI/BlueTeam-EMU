import { z } from 'zod';

export const MitreTechniqueSchema = z.object({
  id: z.string().regex(/^T\d{4}$/),
  name: z.string().min(1),
  tactic: z.string().min(1),
  url: z.string().url().optional()
});
export type MitreTechnique = z.infer<typeof MitreTechniqueSchema>;

const TACTICS = [
  'reconnaissance',
  'resource-development',
  'initial-access',
  'execution',
  'persistence',
  'privilege-escalation',
  'defense-evasion',
  'credential-access',
  'discovery',
  'lateral-movement',
  'collection',
  'command-and-control',
  'exfiltration',
  'impact'
] as const;

const TABLE: MitreTechnique[] = [
  // initial access
  { id: 'T1566', name: 'Phishing', tactic: 'initial-access' },
  { id: 'T1566.001', name: 'Spearphishing Attachment', tactic: 'initial-access' },
  { id: 'T1566.002', name: 'Spearphishing Link', tactic: 'initial-access' },
  // execution / persistence
  { id: 'T1059', name: 'Command and Scripting Interpreter', tactic: 'execution' },
  { id: 'T1059.001', name: 'PowerShell', tactic: 'execution' },
  { id: 'T1543', name: 'Create or Modify System Process', tactic: 'persistence' },
  // defense evasion
  { id: 'T1078', name: 'Valid Accounts', tactic: 'defense-evasion' },
  { id: 'T1070', name: 'Indicator Removal', tactic: 'defense-evasion' },
  { id: 'T1490', name: 'Inhibit System Recovery', tactic: 'impact' },
  // credential access
  { id: 'T1110', name: 'Brute Force', tactic: 'credential-access' },
  { id: 'T1110.001', name: 'Password Guessing', tactic: 'credential-access' },
  { id: 'T1558', name: 'Steal or Forge Kerberos Tickets', tactic: 'credential-access' },
  { id: 'T1558.003', name: 'Kerberoasting', tactic: 'credential-access' },
  // discovery / lateral
  { id: 'T1018', name: 'Remote System Discovery', tactic: 'discovery' },
  { id: 'T1021', name: 'Remote Services', tactic: 'lateral-movement' },
  { id: 'T1021.001', name: 'Remote Desktop Protocol', tactic: 'lateral-movement' },
  // C2 / exfil
  { id: 'T1071', name: 'Application Layer Protocol', tactic: 'command-and-control' },
  { id: 'T1041', name: 'Exfiltration Over C2 Channel', tactic: 'exfiltration' },
  // impact / collection
  { id: 'T1486', name: 'Data Encrypted for Impact', tactic: 'impact' },
  { id: 'T1657', name: 'Financial Theft', tactic: 'impact' },
  { id: 'T1005', name: 'Data from Local System', tactic: 'collection' },
  { id: 'T1003', name: 'OS Credential Dumping', tactic: 'credential-access' }
];

export function loadMitreReference(): MitreTechnique[] {
  return [...TABLE];
}

export function isKnownMitreId(id: string): boolean {
  return TABLE.some((t) => t.id === id);
}

export function getMitre(id: string): MitreTechnique | undefined {
  return TABLE.find((t) => t.id === id);
}

export const KNOWN_TACTICS = TACTICS;
