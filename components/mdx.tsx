import { Children, isValidElement, type ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import defaultComponents from 'fumadocs-ui/mdx';
import { Callout } from 'fumadocs-ui/components/callout';
import { Steps, Step as FumaStep } from 'fumadocs-ui/components/steps';
import { Tabs, Tab } from 'fumadocs-ui/components/tabs';

type ContentProps = { children?: ReactNode };

function Note({ children }: ContentProps) { return <Callout type="info">{children}</Callout>; }
function Tip({ children }: ContentProps) { return <Callout type="idea">{children}</Callout>; }
function Warning({ children }: ContentProps) { return <Callout type="warn">{children}</Callout>; }
function Step({ title, children }: ContentProps & { title?: string }) {
  return <FumaStep>{title && <h3>{title}</h3>}{children}</FumaStep>;
}
function Frame({ children }: ContentProps) { return <div className="docs-frame">{children}</div>; }
function Badge({ children, color = 'gray' }: ContentProps & { color?: string }) {
  return <span className="docs-badge" data-color={color}>{children}</span>;
}
function RequestExample({ children }: ContentProps) {
  return <section className="docs-example" aria-label="Request example"><div className="docs-example-label">Request</div>{children}</section>;
}
function ResponseExample({ children }: ContentProps) {
  return <section className="docs-example" aria-label="Response example"><div className="docs-example-label">Response</div>{children}</section>;
}
function Accordion({ title, children }: ContentProps & { title: string; icon?: string }) {
  return <details className="docs-disclosure"><summary>{title}</summary>{children}</details>;
}
function AccordionGroup({ children }: ContentProps) { return <div>{children}</div>; }

const languageLabels: Record<string, string> = { bash: 'cURL', shell: 'cURL', python: 'Python', javascript: 'JavaScript', js: 'JavaScript', json: 'JSON' };
function languageOf(node: ReactNode): string | undefined {
  if (!isValidElement<Record<string, unknown>>(node)) return undefined;
  const props = node.props;
  if (typeof props['data-language'] === 'string') return props['data-language'];
  if (typeof props.className === 'string') {
    const language = /language-([\w-]+)/.exec(props.className)?.[1];
    if (language) return language;
  }
  for (const child of Children.toArray(props.children as ReactNode)) {
    const language = languageOf(child);
    if (language) return language;
  }
}
function CodeGroup({ children, titles }: ContentProps & { titles?: string[] }) {
  const blocks = Children.toArray(children).filter(isValidElement);
  const labels = blocks.map((block, index) => titles?.[index] ?? languageLabels[languageOf(block) ?? ''] ?? `Example ${index + 1}`);
  const uniqueLabels = labels.map((label, index) => labels.indexOf(label) === index ? label : `${label} ${index + 1}`);
  return <Tabs items={uniqueLabels}>{blocks.map((block, index) => <Tab key={index} value={uniqueLabels[index]}>{block}</Tab>)}</Tabs>;
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultComponents,
    Note, Info: Note, Tip, Warning, Steps, Step, Frame, Badge,
    RequestExample, ResponseExample, Accordion, AccordionGroup, CodeGroup,
    ...components,
  };
}
