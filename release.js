#!/usr/bin/env node

const semanticRelease = require('semantic-release');

async function release() {
  try {
    const result = await semanticRelease({
      // Core options
      branches: [
        'master',
      ],
      repositoryUrl: 'https://github.com/MatteoGioioso/lambda-flame-js.git',
      dryRun: process.env.ENV === 'dev',
      ci: process.env.ENV !== 'dev',
      npmPublish: false
    }, {
      env: {
        ...process.env,
        GITHUB_TOKEN: process.env.GITHUB_TOKEN,
        GIT_AUTHOR_NAME: 'MatteoGioioso'
      },
    });

    if (result) {
      const {lastRelease, commits, nextRelease, releases} = result;

      console.log(`Published ${nextRelease.type} release version ${nextRelease.version} containing ${commits.length} commits.`);

      if (lastRelease.version) {
        console.log(`The last release was "${lastRelease.version}".`);
      }

      for (const release of releases) {
        console.log(`The release was published with plugin "${release.pluginName}".`);
      }
    } else {
      console.log('No release published.');
    }

    const { nextRelease } = result;
    return nextRelease.version
  } catch (err) {
    console.error('The automated release failed with %O', err)
  }
}

release().then(v => {
  console.log(v)
})
