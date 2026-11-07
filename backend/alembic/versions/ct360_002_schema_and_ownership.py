"""Create missing application tables and add ownership without altering legacy reports."""
from alembic import op
import sqlalchemy as sa
revision='ct360_002'
down_revision='669746d85f68'
branch_labels=None
depends_on=None

def upgrade():
    bind=op.get_bind()
    tables=set(sa.inspect(bind).get_table_names())
    common=lambda: [sa.Column('id',sa.String(36),primary_key=True),sa.Column('risk_classification',sa.String(50),nullable=False),sa.Column('risk_score',sa.Integer,nullable=False),sa.Column('confidence',sa.String(20),nullable=False),sa.Column('summary',sa.Text),sa.Column('report_data',sa.Text,nullable=False),sa.Column('created_at',sa.DateTime(timezone=True),nullable=False)]
    if 'scan_records' not in tables:
        op.create_table('scan_records',*common(),sa.Column('url',sa.String(2048),nullable=False),sa.Column('hostname',sa.String(255),nullable=False),sa.Column('registered_domain',sa.String(255),nullable=False),sa.Column('ip_address',sa.String(100)))
    if 'scam_analysis_records' not in tables:
        op.create_table('scam_analysis_records',*common(),sa.Column('message_preview',sa.String(255),nullable=False),sa.Column('message_hash',sa.String(64),nullable=False),sa.Column('analysis_source',sa.String(50),nullable=False),sa.Column('scam_archetype',sa.String(100),nullable=False),sa.Column('detected_tactics_count',sa.Integer,nullable=False),sa.Column('detected_language',sa.String(20),nullable=False))
    if 'blockchain_registration_records' not in tables:
        op.create_table('blockchain_registration_records',sa.Column('id',sa.String(36),primary_key=True),sa.Column('report_id',sa.String(64),nullable=False),sa.Column('report_type',sa.String(32),nullable=False),sa.Column('report_version',sa.Integer,nullable=False),sa.Column('canonical_version',sa.String(16),nullable=False),sa.Column('hash_algorithm',sa.String(16),nullable=False),sa.Column('content_hash',sa.String(66),nullable=False),sa.Column('report_id_hash',sa.String(66),nullable=False),sa.Column('chain_id',sa.Integer,nullable=False),sa.Column('contract_address',sa.String(42),nullable=False),sa.Column('transaction_hash',sa.String(66),nullable=False,unique=True),sa.Column('block_number',sa.Integer,nullable=False),sa.Column('signer_address',sa.String(42),nullable=False),sa.Column('registration_status',sa.String(20),nullable=False),sa.Column('snapshot_data',sa.Text,nullable=False),sa.Column('registered_at',sa.DateTime(timezone=True),nullable=False),sa.UniqueConstraint('report_id','report_version',name='uq_report_version'))
    for table in ('scan_records','scam_analysis_records','blockchain_registration_records'):
        if 'owner_id' not in {c['name'] for c in sa.inspect(bind).get_columns(table)}:
            op.add_column(table,sa.Column('owner_id',sa.String(128),nullable=True))
        if 'ix_'+table+'_owner_id' not in {i['name'] for i in sa.inspect(bind).get_indexes(table)}:
            op.create_index('ix_'+table+'_owner_id',table,['owner_id'])
    for table,cols in [('scan_records',['url','hostname','registered_domain']),('scam_analysis_records',['message_hash']),('blockchain_registration_records',['report_id','content_hash','report_id_hash'])]:
        existing={i['name'] for i in sa.inspect(bind).get_indexes(table)}
        for col in cols:
            name='ix_'+table+'_'+col
            if name not in existing:op.create_index(name,table,[col])

def downgrade():
    raise RuntimeError('Destructive schema downgrade disabled; restore a reviewed backup instead.')
