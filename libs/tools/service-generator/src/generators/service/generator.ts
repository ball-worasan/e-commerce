import {
  Tree,
  formatFiles,
  generateFiles,
  joinPathFragments,
} from '@nx/devkit';
import { applicationGenerator as nestApplicationGenerator } from '@nx/nest';
import type { ServiceGeneratorSchema } from './schema';

export async function serviceGenerator(
  tree: Tree,
  options: ServiceGeneratorSchema,
) {
  await nestApplicationGenerator(tree, {
    directory: `apps/${options.name}`,
    name: options.name,
    // `formatter` is set explicitly (instead of left to auto-detection) so
    // generation never triggers an on-demand network install of a formatter
    // package (e.g. oxfmt) — keeps this generator deterministic and offline.
    formatter: 'none',
    e2eTestRunner: 'none',
  });

  generateFiles(
    tree,
    joinPathFragments(__dirname, 'files'),
    `apps/${options.name}`,
    { name: options.name },
  );

  await formatFiles(tree);
}

export default serviceGenerator;
