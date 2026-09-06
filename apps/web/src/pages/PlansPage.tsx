import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import posthog from 'posthog-js';
import {
  APP_NAV_LINKS,
  Button,
  HelperText,
  Input,
  PlansTemplate,
  ReorderableList,
  SectionCard,
} from '@leanlog/ui';
import { useStore } from '../state';
import { HeaderControls, renderRouterNavLink } from './_shared';

export default function PlansPage() {
  const { plans, addPlan, reorderPlans } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  return (
    <PlansTemplate
      heading={{
        title: 'Plans',
        backHref: '/track/goals',
        navLinks: APP_NAV_LINKS,
        renderNavLink: renderRouterNavLink,
        rightContent: <HeaderControls />,
      }}
      listSection={
        <SectionCard title="Your plans">
          <HelperText as="p">
            Apply a plan to a day, or point a goal at one as its default day shape.
          </HelperText>
          {plans.length === 0 ? (
            <HelperText as="p">No plans yet. Build one to simulate a day of eating.</HelperText>
          ) : (
            <ReorderableList
              items={plans.map((p) => ({
                id: p.id,
                title: p.name,
                meta: <HelperText>{p.meals.length} meals</HelperText>,
                onOpen: () => nav(`/track/goals/plans/${p.id}`),
              }))}
              onReorder={(orderedIds) => void reorderPlans(orderedIds)}
            />
          )}
        </SectionCard>
      }
      addSection={
        <SectionCard title="Add plan">
          <Input
            value={name}
            placeholder="e.g. High protein day"
            onChange={(e) => {
              setName(e.target.value);
              setError(null);
            }}
          />
          {error ? <HelperText>{error}</HelperText> : null}
          <Button
            className="w-full"
            disabled={!name.trim() || saving}
            onClick={async () => {
              setSaving(true);
              setError(null);
              try {
                const plan = await addPlan(name.trim());
                posthog.capture('plan_created', { source: 'blank' });
                setName('');
                nav(`/track/goals/plans/${plan.id}`);
              } catch (e) {
                setError(e instanceof Error ? e.message : 'Could not create plan');
              } finally {
                setSaving(false);
              }
            }}
          >
            Add plan
          </Button>
        </SectionCard>
      }
    />
  );
}
