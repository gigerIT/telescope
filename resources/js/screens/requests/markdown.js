function filled(value) {
    if (value === null || value === undefined || value === '') {
        return false;
    }

    if (Array.isArray(value)) {
        return value.length > 0;
    }

    return typeof value !== 'object' || Object.keys(value).length > 0;
}

function table(rows) {
    return [
        '| Field | Value |',
        '| --- | --- |',
        ...rows.filter(([, value]) => filled(value)).map(([field, value]) => {
            const content = (Array.isArray(value) ? value.join(', ') : String(value))
                .replace(/\|/g, '\\|')
                .replace(/\r?\n/g, '<br>');

            return `| ${field} | ${content} |`;
        }),
    ].join('\n');
}

function codeBlock(value) {
    const language = typeof value === 'string' ? 'text' : 'json';
    const content = typeof value === 'string' ? value : JSON.stringify(value, null, 2);
    const fenceLength = Math.max(3, ...[...content.matchAll(/`+/g)].map(([ticks]) => ticks.length + 1));
    const fence = '`'.repeat(fenceLength);

    return `${fence}${language}\n${content}\n${fence}`;
}

function dataSection(title, value) {
    return filled(value) ? `## ${title}\n\n${codeBlock(value)}` : null;
}

function headersSection(title, headers) {
    if (! filled(headers)) {
        return null;
    }

    return `## ${title}\n\n${table(Object.entries(headers))}`;
}

function userSummary(user) {
    if (! filled(user)) {
        return null;
    }

    const details = [user.name ? user.email : null, filled(user.id) ? `ID: ${user.id}` : null].filter(Boolean);

    return `${user.name || user.email || user.id}${details.length ? ` (${details.join(', ')})` : ''}`;
}

function relatedExceptions(entries) {
    if (! entries.length) {
        return null;
    }

    const details = entries.map(({content}) => {
        const location = content.file && filled(content.line) ? `${content.file}:${content.line}` : content.file;

        return [
            `### ${content.class}`,
            content.message,
            location ? `- **Location:** ${location}` : null,
        ].filter(Boolean).join('\n\n');
    });

    return `## Exceptions (${entries.length})\n\n${details.join('\n\n')}`;
}

function relatedQueries(entries) {
    if (! entries.length) {
        return null;
    }

    const details = entries.map(({content}, index) => {
        const metadata = [content.connection, filled(content.time) ? `${content.time}ms` : null].filter(Boolean).join(', ');

        return `### Query ${index + 1}${metadata ? ` (${metadata})` : ''}\n\n${codeBlock(content.sql)}`;
    });

    return `## Queries (${entries.length})\n\n${details.join('\n\n')}`;
}

function relatedLogs(entries) {
    if (! entries.length) {
        return null;
    }

    const details = entries.map(({content}) => [
        `### ${(content.level || 'log').toUpperCase()}`,
        codeBlock(content.message),
        filled(content.context) ? `**Context**\n\n${codeBlock(content.context)}` : null,
    ].filter(Boolean).join('\n\n'));

    return `## Logs (${entries.length})\n\n${details.join('\n\n')}`;
}

function relatedModels(entries) {
    if (! entries.length) {
        return null;
    }

    const details = entries.map(({content}) => [
        `### ${content.action} ${content.model}`,
        filled(content.count) ? `- **Hydrated:** ${content.count}` : null,
        filled(content.changes) ? `**Changes**\n\n${codeBlock(content.changes)}` : null,
    ].filter(Boolean).join('\n\n'));

    return `## Model Events (${entries.length})\n\n${details.join('\n\n')}`;
}

export default function requestMarkdown(entry, batch = []) {
    const content = entry.content;
    const sections = [
        '# Request Details',
        table([
            ['Method', content.method],
            ['URI', content.uri],
            ['Status', content.response_status],
            ['Duration', filled(content.duration) ? `${content.duration}ms` : null],
            ['Time', entry.created_at],
            ['Controller', content.controller_action],
            ['Middleware', content.middleware],
            ['User', userSummary(content.user)],
            ['Hostname', content.hostname],
            ['IP Address', content.ip_address],
            ['Memory', filled(content.memory) ? `${content.memory}MB` : null],
        ]),
        headersSection('Request Headers', content.headers),
        dataSection('Request Payload', content.payload),
        dataSection('Session', content.session),
        headersSection('Response Headers', content.response_headers),
        dataSection('Response', content.response),
        relatedExceptions(batch.filter(({type}) => type === 'exception')),
        relatedQueries(batch.filter(({type}) => type === 'query')),
        relatedLogs(batch.filter(({type}) => type === 'log')),
        relatedModels(batch.filter(({type}) => type === 'model')),
    ];

    return sections.filter(Boolean).join('\n\n') + '\n';
}
