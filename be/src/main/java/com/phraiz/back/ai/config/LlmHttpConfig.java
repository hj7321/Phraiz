package com.phraiz.back.ai.config;

import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.concurrent.ThreadPoolTaskExecutor;

import java.net.http.HttpClient;
import java.time.Duration;
import java.util.concurrent.Executor;

@Configuration
@EnableConfigurationProperties(LlmGatewayProperties.class)
public class LlmHttpConfig {

    @Bean
    public HttpClient llmHttpClient(LlmGatewayProperties properties) {
        return HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .version(HttpClient.Version.HTTP_1_1)
                .build();
    }

    @Bean(name = "llmStreamExecutor")
    public Executor llmStreamExecutor() {
        ThreadPoolTaskExecutor executor = new ThreadPoolTaskExecutor();
        executor.setCorePoolSize(8);
        executor.setMaxPoolSize(32);
        executor.setQueueCapacity(100);
        executor.setThreadNamePrefix("llm-stream-");
        executor.initialize();
        return executor;
    }
}
