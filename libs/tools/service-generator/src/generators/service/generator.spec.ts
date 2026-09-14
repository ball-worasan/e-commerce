import { createTreeWithEmptyWorkspace } from '@nx/devkit/testing';
import { Tree } from '@nx/devkit';
import { serviceGenerator } from './generator';

describe('service generator', () => {
  let tree: Tree;

  beforeEach(() => {
    tree = createTreeWithEmptyWorkspace();
  });

  it('generates a NestJS app with a health controller and Dockerfile', async () => {
    await serviceGenerator(tree, { name: 'ping-service' });

    expect(tree.exists('apps/ping-service/src/main.ts')).toBe(true);
    expect(tree.exists('apps/ping-service/src/app/health/health.controller.ts')).toBe(true);
    expect(tree.exists('apps/ping-service/Dockerfile')).toBe(true);

    const health = tree.read(
      'apps/ping-service/src/app/health/health.controller.ts',
      'utf-8'
    );
    expect(health).toContain('HealthController');
    expect(health).toContain("'health'");
  });
});