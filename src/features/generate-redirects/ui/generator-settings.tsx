import { useTranslation } from 'react-i18next';
import { Select } from 'shared/ui/select';
import { Checkbox } from 'shared/ui/checkbox';
import { ExternalLink } from 'shared/ui/external-link';
import type { RedirectTemplate } from 'entities/redirect';
import type { GenerateRedirectsController } from '../model/use-generate-redirects';

const TEMPLATE_OPTIONS: { value: RedirectTemplate; label: string }[] = [
  { value: 'nginx', label: 'Nginx' },
  { value: 'apache', label: 'Apache' },
];

type GeneratorSettingsProps = {
  generator: GenerateRedirectsController;
};

export function GeneratorSettings({ generator }: GeneratorSettingsProps) {
  const { state, actions } = generator;
  const { t } = useTranslation();

  return (
    <>
      <Select
        id="templateSelect"
        label={t('generatorSettings.templateLabel')}
        options={TEMPLATE_OPTIONS}
        value={state.template}
        onChange={(event) => actions.setTemplate(event.target.value as RedirectTemplate)}
      />

      <Checkbox
        id="group"
        label={t('generatorSettings.groupLabel')}
        title={t('generatorSettings.groupTitle')}
        checked={state.grouped}
        onChange={(event) => actions.setGrouped(event.target.checked)}
      />

      <ExternalLink href="https://coolakov.ru/tools/ping/">
        {t('generatorSettings.checkRedirectList')}
      </ExternalLink>
    </>
  );
}
