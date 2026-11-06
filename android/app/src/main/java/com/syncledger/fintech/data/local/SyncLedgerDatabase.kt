package com.syncledger.fintech.data.local

import android.content.Context
import androidx.room.Database
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.TypeConverter
import androidx.room.TypeConverters
import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.local.entity.SyncStatus
import com.syncledger.fintech.data.local.entity.TransactionEntity
import net.sqlcipher.database.SQLiteDatabase
import net.sqlcipher.database.SupportFactory

class SyncStatusConverters {
    @TypeConverter
    fun fromStatus(status: SyncStatus): String = status.name

    @TypeConverter
    fun toStatus(value: String): SyncStatus = SyncStatus.valueOf(value)
}

@Database(
    entities = [TransactionEntity::class],
    version = 1,
    exportSchema = true
)
@TypeConverters(SyncStatusConverters::class)
abstract class SyncLedgerDatabase : RoomDatabase() {

    abstract fun transactionDao(): TransactionDao

    companion object {
        private const val DB_NAME = "syncledger_encrypted.db"

        fun buildEncrypted(context: Context, passphraseBytes: ByteArray): SyncLedgerDatabase {
            val supportFactory = SupportFactory(SQLiteDatabase.getBytes(
                String(passphraseBytes).toCharArray()
            ))
            return Room.databaseBuilder(
                context.applicationContext,
                SyncLedgerDatabase::class.java,
                DB_NAME
            )
                .openHelperFactory(supportFactory)
                .fallbackToDestructiveMigration()
                .build()
        }
    }
}
