/**
 * Build Ivory and publish dist/ to the root of the orphan gh-pages branch.
 * Does not switch the working branch. Requires a clean ability to push origin.
 */
import { execSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

execSync('npm run build', { stdio: 'inherit' })

const stage = mkdtempSync(join(tmpdir(), 'ivory-pages-'))
execSync(`cp -a dist/. ${JSON.stringify(stage)}/`)
copyFileSync(join(stage, 'index.html'), join(stage, '404.html'))
writeFileSync(join(stage, '.nojekyll'), '')

const indexFile = join(tmpdir(), `ivory-pages-${process.pid}.index`)
const env = { ...process.env, GIT_INDEX_FILE: indexFile }
execSync('git read-tree --empty', { env })
execSync(`git --work-tree=${JSON.stringify(stage)} add -A`, { env })
const tree = execSync('git write-tree', { env, encoding: 'utf8' }).trim()

let parent = ''
try {
  parent = execSync('git rev-parse --verify refs/heads/gh-pages', { encoding: 'utf8' }).trim()
} catch {
  parent = ''
}
const commit = execSync(
  `git commit-tree ${tree} ${parent ? `-p ${parent}` : ''} -m ${JSON.stringify('Deploy Ivory static site')}`,
  { encoding: 'utf8' },
).trim()
execSync(`git update-ref refs/heads/gh-pages ${commit}`)
execSync('git push origin gh-pages', { stdio: 'inherit' })
console.log(`Pushed gh-pages ${commit}`)
