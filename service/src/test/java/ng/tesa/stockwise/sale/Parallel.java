package ng.tesa.stockwise.sale;

import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.function.IntFunction;

/**
 * Runs N attempts that all start on one {@link CountDownLatch}, so they really overlap
 * (test-plan "Test design notes"). Each outcome is the attempt's result or the exception it threw.
 */
final class Parallel {

    private Parallel() {
    }

    static <T> List<Object> run(int attempts, IntFunction<T> attempt) throws Exception {
        CountDownLatch ready = new CountDownLatch(attempts);
        CountDownLatch start = new CountDownLatch(1);
        try (ExecutorService pool = Executors.newFixedThreadPool(attempts)) {
            List<Future<Object>> futures = new ArrayList<>();
            for (int i = 0; i < attempts; i++) {
                int n = i;
                futures.add(pool.submit(() -> {
                    ready.countDown();
                    start.await();
                    try {
                        return (Object) attempt.apply(n);
                    } catch (RuntimeException e) {
                        return e;
                    }
                }));
            }
            ready.await(10, TimeUnit.SECONDS);
            start.countDown();
            List<Object> outcomes = new ArrayList<>();
            for (Future<Object> future : futures) {
                outcomes.add(future.get(30, TimeUnit.SECONDS));
            }
            return outcomes;
        }
    }
}
