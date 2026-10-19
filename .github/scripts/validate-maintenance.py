"""Validate updater coverage and keep repository automation from merging PRs."""
from pathlib import Path
import re

import yaml


class UniqueKeys(yaml.BaseLoader):
    def construct_mapping(self, node, deep=False):
        result = {}
        for key_node, value_node in node.value:
            key = self.construct_object(key_node, deep=deep)
            if key in result:
                raise ValueError(f"Duplicate YAML key: {key}")
            result[key] = self.construct_object(value_node, deep=deep)
        return result


def validate(root):
    config = yaml.load((root / '.github/dependabot.yml').read_text(), Loader=UniqueKeys)
    if config.get('version') != '2':
        raise ValueError('Dependabot version must be 2')
    expected = {('github-actions', '/')}
    for manifest, ecosystem in [('composer.json', 'composer'), ('package.json', 'npm')]:
        if (root / manifest).is_file():
            expected.add((ecosystem, '/'))
    seen = set()
    for entry in config['updates']:
        pair = (entry['package-ecosystem'], entry['directory'])
        if pair in seen or pair not in expected:
            raise ValueError(f'Duplicate or unsupported updater: {pair}')
        if entry.get('target-branch') or entry.get('schedule', {}).get('interval') != 'weekly':
            raise ValueError(f'Updater must cover the default branch weekly: {pair}')
        seen.add(pair)
    if seen != expected:
        raise ValueError(f'Missing updater coverage: {expected - seen}')
    for path in (root / '.github/workflows').glob('*.y*ml'):
        text = path.read_text()
        workflow = yaml.load(text, Loader=UniqueKeys)
        if not isinstance(workflow, dict) or not workflow.get('jobs'):
            raise ValueError(f'Invalid workflow: {path.name}')
        if re.search(r'gh\s+pr\s+merge|dependabot-auto-merge|["\']owner["\']\s*:\s*["\']laravel["\']', text):
            raise ValueError(f'Repository workflow bypasses owner integration: {path.name}')
    print('Updater coverage and repository merge boundary validated')


if __name__ == '__main__':
    validate(Path(__file__).resolve().parents[2])
