import fs from 'fs';
import path from 'path';

describe('Wiring checks', () => {
  it('exports exist', ()=>{
    const pkg = require('../../package.json');
    expect(pkg.scripts).toBeDefined();
  });

  it('migration files present', ()=>{
    const mdir = path.join(__dirname, '..','..','supabase','migrations');
    const files = fs.readdirSync(mdir).filter(f=>f.endsWith('.sql'));
    expect(files.length).toBeGreaterThanOrEqual(4);
  });

  it('Dockerfile exists', ()=>{
    expect(fs.existsSync(path.join(__dirname,'..','..','Dockerfile'))).toBeTruthy();
  });
});
