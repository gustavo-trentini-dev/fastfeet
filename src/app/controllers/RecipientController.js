import * as Yup from 'yup';
import Recipient from '../models/Recipient';

class RecipientController {
  async index(req, res) {
    const recipients = await Recipient.findAll({
      attributes: [
        'name',
        'street',
        'number',
        'complement',
        'post_code',
        'state',
      ],
    });

    return res.json(recipients);
  }

  async store(req, res) {
    const schema = Yup.object().shape({
      name: Yup.string().required(),
      post_code: Yup.string()
        .min(9)
        .max(9)
        .required(),
      state: Yup.string()
        .min(2)
        .max(2)
        .required(),
      street: Yup.string().required(),
      number: Yup.string(),
      complement: Yup.string(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const recipientExists = await Recipient.findOne({
      where: { name: req.body.name },
    });

    if (recipientExists) {
      return res.status(400).json({ error: 'Recipient already exists' });
    }

    const {
      id,
      name,
      post_code,
      state,
      street,
      number,
      complement,
      avatar_id,
    } = await Recipient.create(req.body);

    return res.json({
      id,
      name,
      post_code,
      state,
      street,
      number,
      complement,
      avatar_id,
    });
  }

  async update(req, res) {
    const schema = Yup.object().shape({
      oldName: Yup.string(),
      name: Yup.string().required(),
      post_code: Yup.string()
        .min(9)
        .max(9),
      state: Yup.string()
        .min(2)
        .max(2),
      street: Yup.string(),
      number: Yup.string(),
      complement: Yup.string(),
    });

    if (!(await schema.isValid(req.body))) {
      return res.status(400).json({ error: 'Validation fails' });
    }

    const { oldName } = req.body;
    const newName = req.body.name;

    const searchName = oldName || newName;

    const recipient = await Recipient.findOne({
      where: { name: searchName },
    });

    if (!recipient) {
      return res.status(400).json({ error: 'Recipient does not exist' });
    }

    if (oldName && recipient.name !== oldName) {
      const anotherRecipient = await Recipient.findOne({
        where: { name: newName },
      });

      if (anotherRecipient) {
        return res.status(400).json({ error: 'Name already in use' });
      }
    }

    const {
      id,
      name,
      post_code,
      state,
      street,
      number,
      complement,
    } = await recipient.update(req.body);

    return res.json({
      id,
      name,
      post_code,
      state,
      street,
      number,
      complement,
    });
  }
}

export default new RecipientController();
