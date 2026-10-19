# Repository maintenance

Reuse Dependabot for weekly Actions, Composer and npm updates. The existing
Actions group and cooldown are retained. New Composer/npm version queues each
allow two open PRs; security-update generation remains a separate repository
setting. Configuration on an unmerged branch does not activate these entries.

Repository workflows do not merge dependency PRs. Paperclip owns classification,
independent review of the exact current head, required checks and the final
integration decision. Workflow/source changes and minor or major dependencies
require the owner's decision; review does not grant publication or deployment.

The tests workflow validates maintenance configuration, tests/builds assets,
runs PHP static analysis, then runs at most two PHP test workers. Asset validation
never commits generated files. Release/changelog behavior is unchanged and
requires separate release authority. CodeQL does not scan PHP.
