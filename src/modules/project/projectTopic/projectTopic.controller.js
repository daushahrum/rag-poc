import * as projectTopicService from './projectTopic.service.js';

export async function createTopic(req, res) {
    try {
        const topic = await projectTopicService.createTopic(req.body, req.token);

        return res.json(topic);
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}

export async function updateTopic(req, res) {
    try {
        await projectTopicService.updateTopic(req.body, req.token);

        return res.status(200).json({
            message: 'Topic updated',
        });
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}

export async function deleteTopic(req, res) {
    try {
        await projectTopicService.deleteTopic(req.body.id, req.token);

        return res.status(200).json({
            message: 'Topic deactivated',
        });
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}

export async function listTopics(req, res) {
    try {
        const topics = await projectTopicService.getTopics(req.query, req.token);

        return res.json(topics);
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}

export async function findTopic(req, res) {
    try {
        const topic = await projectTopicService.getTopic(req.query, req.token);

        return res.json(topic);
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}

export async function getTopic(req, res) {
    try {
        const topic = await projectTopicService.getTopicById(req.params.id, req.token);

        return res.json(topic);
    } catch (error) {
        return res.status(error.status ?? 400).json({
            message: error.message,
        });
    }
}
