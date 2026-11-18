import mysql from 'mysql2/promise';

const pool=mysql.createPool({
  host:process.env.DB_HOST||'127.0.0.1',
  port:Number(process.env.DB_PORT||3306),
  user:process.env.DB_USER||'strata',
  password:process.env.DB_PASSWORD||'strata',
  database:process.env.DB_NAME||'strata',
  waitForConnections:true,
  connectionLimit:Number(process.env.DB_CONNECTION_LIMIT||10),
  dateStrings:true,
  timezone:'Z',
});

const schema=[
  `CREATE TABLE IF NOT EXISTS app_metadata (
    id TINYINT UNSIGNED NOT NULL PRIMARY KEY,
    data_version INT UNSIGNED NOT NULL,
    updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name TEXT NOT NULL,
    sort_order INT UNSIGNED NOT NULL,
    INDEX projects_sort_order_idx (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS categories (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    name VARCHAR(40) NOT NULL,
    color CHAR(7) NOT NULL,
    sort_order INT UNSIGNED NOT NULL,
    INDEX categories_sort_order_idx (sort_order)
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  `CREATE TABLE IF NOT EXISTS entries (
    id VARCHAR(191) NOT NULL PRIMARY KEY,
    entry_date DATE NOT NULL,
    title VARCHAR(120) NOT NULL,
    depth TINYINT UNSIGNED NOT NULL,
    progress TINYINT UNSIGNED NOT NULL,
    note LONGTEXT NOT NULL,
    quantity DOUBLE NULL,
    unit TEXT NOT NULL,
    project_id VARCHAR(191) NULL,
    category_id VARCHAR(191) NULL,
    created_at BIGINT NOT NULL,
    sort_order INT UNSIGNED NOT NULL,
    INDEX entries_date_idx (entry_date),
    INDEX entries_project_idx (project_id),
    INDEX entries_category_idx (category_id),
    CONSTRAINT entries_project_fk FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE SET NULL,
    CONSTRAINT entries_category_fk FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
];

const delay=milliseconds=>new Promise(resolve=>setTimeout(resolve,milliseconds));

export async function initializeDatabase(){
  const attempts=Number(process.env.DB_CONNECT_ATTEMPTS||30);
  for(let attempt=1;attempt<=attempts;attempt++){
    try{
      const connection=await pool.getConnection();
      try{for(const statement of schema)await connection.query(statement)}finally{connection.release()}
      return;
    }catch(error){
      if(attempt===attempts)throw error;
      console.log(`MySQLへの接続を待っています (${attempt}/${attempts})`);
      await delay(2000);
    }
  }
}

async function insertRows(connection,table,columns,rows){
  if(rows.length===0)return;
  const values=rows.map(()=>`(${columns.map(()=>'?').join(',')})`).join(',');
  await connection.execute(`INSERT INTO ${table} (${columns.join(',')}) VALUES ${values}`,rows.flat());
}

export async function loadData(){
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    const [metadata]=await connection.query('SELECT data_version FROM app_metadata WHERE id = 1');
    if(metadata.length===0){
      await connection.commit();
      return null;
    }
    const [projects]=await connection.query('SELECT id, name FROM projects ORDER BY sort_order, id');
    const [categories]=await connection.query('SELECT id, name, color FROM categories ORDER BY sort_order, id');
    const [entries]=await connection.query(`SELECT id, entry_date, title, depth, progress, note, quantity, unit,
      project_id, category_id, created_at FROM entries ORDER BY sort_order, id`);
    await connection.commit();
    return {
      version:2,
      projects:projects.map(row=>({id:row.id,name:row.name})),
      categories:categories.map(row=>({id:row.id,name:row.name,color:row.color})),
      entries:entries.map(row=>({
        id:row.id,
        date:row.entry_date,
        title:row.title,
        depth:row.depth,
        progress:row.progress,
        note:row.note,
        ...(row.quantity===null?{}:{quantity:Number(row.quantity)}),
        unit:row.unit,
        projectId:row.project_id??'',
        categoryId:row.category_id??'',
        createdAt:Number(row.created_at),
      })),
    };
  }catch(error){
    await connection.rollback();
    throw error;
  }finally{connection.release()}
}

export async function saveData(data){
  const connection=await pool.getConnection();
  try{
    await connection.beginTransaction();
    await connection.query('DELETE FROM entries');
    await connection.query('DELETE FROM categories');
    await connection.query('DELETE FROM projects');
    await insertRows(connection,'projects',['id','name','sort_order'],data.projects.map((project,index)=>[project.id,project.name,index]));
    await insertRows(connection,'categories',['id','name','color','sort_order'],data.categories.map((category,index)=>[category.id,category.name,category.color,index]));
    await insertRows(connection,'entries',['id','entry_date','title','depth','progress','note','quantity','unit','project_id','category_id','created_at','sort_order'],data.entries.map((entry,index)=>[
      entry.id,entry.date,entry.title,entry.depth,entry.progress,entry.note,entry.quantity??null,entry.unit,entry.projectId||null,entry.categoryId||null,entry.createdAt,index,
    ]));
    await connection.execute(`INSERT INTO app_metadata (id, data_version) VALUES (1, ?)
      ON DUPLICATE KEY UPDATE data_version = ?, updated_at = CURRENT_TIMESTAMP(3)`,[data.version,data.version]);
    await connection.commit();
  }catch(error){
    await connection.rollback();
    throw error;
  }finally{connection.release()}
}

export async function checkDatabase(){
  await pool.query('SELECT 1');
}

export async function closeDatabase(){
  await pool.end();
}
