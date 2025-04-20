const cron = require('node-cron');
const { query } = require('../config/db');
const aiController = require('../controllers/aiController');
const notificationController = require('../controllers/notificationController');

/**
 * Initialize all cron jobs for the application
 */
const initCronJobs = () => {
  
  cron.schedule('0 * * * *', async () => {
    console.log('Running scheduled inventory analysis...');
    try {
      await aiController.runScheduledInventoryAnalysis();
      
      
      await updateTaskRunTime('inventory_analysis', 'hourly');
      
      console.log('Scheduled inventory analysis completed successfully');
    } catch (err) {
      console.error('Error running scheduled inventory analysis:', err);
    }
  });
  
  
  cron.schedule('0 2 * * *', async () => {
    console.log('Running scheduled sales forecast...');
    try {
      const response = await aiController.getSalesForecasts(null, null);
      await notificationController.createSystemNotification({
        title: 'Daily Sales Forecast Ready',
        message: 'AI has generated daily sales forecasts. View insights now.',
        type: 'ai_forecast',
        action_link: '/ai-analytics',
        is_global: true
      });
      
      await updateTaskRunTime('sales_forecast', 'daily');
      
      console.log('Scheduled sales forecast completed successfully');
    } catch (err) {
      console.error('Error running scheduled sales forecast:', err);
    }
  });
  
  
  cron.schedule('0 3 * * 0', async () => {
    console.log('Running scheduled business recommendations...');
    try {
      
      const response = await aiController.getRecommendations(null, null);
      
      
      await notificationController.createSystemNotification({
        title: 'Weekly Business Recommendations Ready',
        message: 'AI has analyzed your business data and provided strategic recommendations. Check insights now.',
        type: 'ai_recommendation',
        action_link: '/ai-analytics',
        is_global: true
      });
      
      
      await updateTaskRunTime('business_recommendations', 'weekly');
      
      console.log('Scheduled business recommendations completed successfully');
    } catch (err) {
      console.error('Error running scheduled business recommendations:', err);
    }
  });
  
  console.log('All cron jobs initialized');
};

/**
 * Update the last run and next run times for a scheduled task
 */
const updateTaskRunTime = async (taskType, frequency) => {
  try {
    const now = new Date();
    let nextRun;
    
    
    switch (frequency) {
      case 'hourly':
        nextRun = new Date(now.getTime() + 60 * 60 * 1000); 
        break;
      case 'daily':
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
        break;
      case 'weekly':
        nextRun = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); 
        break;
      case 'monthly':
        
        nextRun = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        nextRun = new Date(now.getTime() + 24 * 60 * 60 * 1000); 
    }
    
    
    const checkTaskSql = `
      SELECT id FROM ai_scheduled_tasks 
      WHERE task_type = $1 AND frequency = $2
    `;
    
    const checkTaskResult = await query(checkTaskSql, [taskType, frequency]);
    
    if (checkTaskResult.rows.length === 0) {
      
      const createTaskSql = `
        INSERT INTO ai_scheduled_tasks (
          task_type, frequency, last_run_at, next_run_at, status
        )
        VALUES ($1, $2, $3, $4, $5)
      `;
      
      await query(createTaskSql, [
        taskType,
        frequency,
        now,
        nextRun,
        'active'
      ]);
    } else {
      
      const updateTaskSql = `
        UPDATE ai_scheduled_tasks
        SET last_run_at = $1, next_run_at = $2, updated_at = NOW()
        WHERE task_type = $3 AND frequency = $4
      `;
      
      await query(updateTaskSql, [
        now,
        nextRun,
        taskType,
        frequency
      ]);
    }
    
    console.log(`Updated scheduled task: ${taskType} (${frequency})`);
    
  } catch (err) {
    console.error('Error updating scheduled task:', err);
  }
};

module.exports = {
  initCronJobs
}; 