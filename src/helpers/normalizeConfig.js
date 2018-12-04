import fs from 'fs';
import findUp from 'find-up';
import fromEntries from 'object.fromentries';
import entries from 'object.entries';

import requireProperties from './requireProperties';

function normalizeProjectConfig(config, {
  extensions,
  projectRoot = process.cwd(),
  requireInteropWrapper,
} = {}) {
  const c = requireProperties(config, ['renderWrapper'], {
    extensions,
    projectRoot,
    requireInteropWrapper,
  });
  return c;
}

function normalizeExtras({ extras }, projectConfig) {
  return {
    ...projectConfig,
    extras: {
      ...extras,
      ...projectConfig.extras,
    },
  };
}

function normalizeProjects(rootConfig, projects, metadata) {
  return fromEntries(entries(projects).map(([name, projectConfig]) => [
    name,
    normalizeExtras(rootConfig, normalizeProjectConfig(projectConfig, metadata)),
  ]));
}

export default function normalizeConfig({
  all,
  /* these are provided by yargs */
  version,
  help,
  $0,
  config: __,
  _,
  /* ^ these were provided by yargs */
  ...config
}, extraData = {}) {
  if (all) {
    const { project, ...rest } = config;
    return {
      ...normalizeProjectConfig(rest, extraData),
      projects: normalizeProjects(rest, config.projects, extraData),
      projectNames: Object.keys(config.projects),
    };
  }
  if (config.project) {
    const { project, ...rest } = config;
    return {
      ...normalizeProjectConfig(rest, extraData),
      projects: normalizeProjects(config, config.projects, extraData),
      projectNames: [project],
    };
  }
  if (!config.projects) {
    const { project: ___, projects, ...rest } = config;
    const packagePath = findUp.sync('package.json', { normalize: false });
    const { name: packageName } = JSON.parse(fs.readFileSync(packagePath));
    const project = packageName || 'root';
    return {
      ...rest,
      projects: normalizeProjects(config, {
        [project]: normalizeProjectConfig(rest, extraData),
      }, extraData),
      projectNames: [project],
    };
  }

  const { project, extras, ...rest } = config;
  return {
    ...normalizeProjectConfig(rest),
    extras,
    projectNames: Object.keys(config.projects),
    projects: normalizeProjects(config, config.projects, extraData),
  };
}
