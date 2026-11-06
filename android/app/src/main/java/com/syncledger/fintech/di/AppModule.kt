package com.syncledger.fintech.di

import android.content.Context
import android.content.SharedPreferences
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import androidx.work.WorkManager
import com.syncledger.fintech.data.local.SyncLedgerDatabase
import com.syncledger.fintech.data.local.dao.TransactionDao
import com.syncledger.fintech.data.remote.SyncLedgerApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.UUID
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    /**
     * FinTech Security Requirement:
     * Stores JWT access tokens and SQLCipher database passphrases inside
     * hardware-backed Android Keystore EncryptedSharedPreferences.
     */
    @Provides
    @Singleton
    fun provideEncryptedSharedPreferences(
        @ApplicationContext context: Context
    ): SharedPreferences {
        val masterKey = MasterKey.Builder(context)
            .setKeyScheme(MasterKey.KeyScheme.AES256_GCM)
            .build()

        return EncryptedSharedPreferences.create(
            context,
            "syncledger_secure_vault",
            masterKey,
            EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
            EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM
        )
    }

    @Provides
    @Singleton
    fun provideEncryptedDatabase(
        @ApplicationContext context: Context,
        securePrefs: SharedPreferences
    ): SyncLedgerDatabase {
        var passphrase = securePrefs.getString("sqlcipher_passphrase", null)
        if (passphrase == null) {
            passphrase = UUID.randomUUID().toString() + UUID.randomUUID().toString()
            securePrefs.edit().putString("sqlcipher_passphrase", passphrase).apply()
        }
        return SyncLedgerDatabase.buildEncrypted(context, passphrase.toByteArray())
    }

    @Provides
    fun provideTransactionDao(database: SyncLedgerDatabase): TransactionDao =
        database.transactionDao()

    @Provides
    @Singleton
    fun provideOkHttpClient(securePrefs: SharedPreferences): OkHttpClient {
        val jwtInterceptor = Interceptor { chain ->
            val token = securePrefs.getString("jwt_auth_token", "") ?: ""
            val req = chain.request().newBuilder()
                .apply {
                    if (token.isNotEmpty()) {
                        addHeader("Authorization", "Bearer $token")
                    }
                }
                .build()
            chain.proceed(req)
        }
        return OkHttpClient.Builder()
            .addInterceptor(jwtInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideSyncLedgerApi(okHttpClient: OkHttpClient): SyncLedgerApi {
        return Retrofit.Builder()
            .baseUrl("https://api.syncledger.fintech/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
            .create(SyncLedgerApi::class.java)
    }

    @Provides
    @Singleton
    fun provideWorkManager(@ApplicationContext context: Context): WorkManager =
        WorkManager.getInstance(context)
}
